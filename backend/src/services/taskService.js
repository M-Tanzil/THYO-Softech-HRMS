const prisma = require('../config/prisma');
const notificationService = require('./notificationService');
const cache = require('../utils/cache');

class TaskService {
  constructor() {
    this.lastOverdueCheck = 0;
  }

  invalidateTaskCaches() {
    cache.delPrefix('tasks_query_');
    cache.delPrefix('task_analytics_');
    cache.delPrefix('my_tasks_');
  }

  async resolveTargetEmployees({ assignmentType, employeeId, employeeIds, targetDepartment, targetPosition }) {
    const type = assignmentType.toUpperCase();

    if (type === 'INDIVIDUAL') {
      const emp = await prisma.employee.findUnique({
        where: { employeeId, status: 'ACTIVE' }
      });
      return emp ? [emp] : [];
    }

    if (type === 'MULTIPLE') {
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) return [];
      return await prisma.employee.findMany({
        where: { employeeId: { in: employeeIds }, status: 'ACTIVE' }
      });
    }

    if (type === 'DEPARTMENT') {
      return await prisma.employee.findMany({
        where: { department: { equals: targetDepartment, mode: 'insensitive' }, status: 'ACTIVE' }
      });
    }

    if (type === 'MANAGERS' || type === 'MANAGER') {
      return await prisma.employee.findMany({
        where: {
          OR: [
            { user: { role: 'MANAGER' } },
            { position: { contains: 'Manager', mode: 'insensitive' } },
            { designation: { contains: 'Manager', mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        }
      });
    }

    if (type === 'POSITION') {
      const isManagerTarget = targetPosition && targetPosition.toLowerCase().includes('manager');
      return await prisma.employee.findMany({
        where: {
          OR: [
            { position: { equals: targetPosition, mode: 'insensitive' } },
            { designation: { equals: targetPosition, mode: 'insensitive' } },
            ...(isManagerTarget ? [
              { user: { role: 'MANAGER' } },
              { position: { contains: 'Manager', mode: 'insensitive' } },
              { designation: { contains: 'Manager', mode: 'insensitive' } }
            ] : [])
          ],
          status: 'ACTIVE'
        }
      });
    }

    if (type === 'ALL') {
      return await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
    }

    return [];
  }

  async refreshOverdueStatuses() {
    const nowMs = Date.now();
    if (nowMs - this.lastOverdueCheck < 120000) {
      return;
    }
    this.lastOverdueCheck = nowMs;

    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        deadline: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] }
      },
      include: {
        assignments: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true, employeeId: true, status: true }
        }
      }
    });

    if (overdueTasks.length > 0) {
      const taskIds = overdueTasks.map(t => t.id);
      await Promise.all([
        prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { status: 'OVERDUE' } }),
        prisma.taskAssignment.updateMany({
          where: { taskId: { in: taskIds }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          data: { status: 'OVERDUE' }
        })
      ]);

      const taskLinks = taskIds.map(id => `/tasks/${id}`);
      const existingNotifs = await prisma.notification.findMany({
        where: { type: 'TASK_OVERDUE', link: { in: taskLinks } },
        select: { recipientId: true, link: true }
      });
      const notifSet = new Set(existingNotifs.map(n => `${n.recipientId}_${n.link}`));

      const notifsToCreate = [];
      for (const task of overdueTasks) {
        for (const assignment of task.assignments) {
          const key = `${assignment.employeeId}_/tasks/${task.id}`;
          if (!notifSet.has(key)) {
            notifsToCreate.push({
              recipientId: assignment.employeeId,
              title: 'TASK OVERDUE',
              message: `Task "${task.title}" is overdue. Please review or complete the pending deliverables.`,
              type: 'TASK_OVERDUE',
              category: 'TASK',
              entityType: 'TASK',
              entityId: task.id,
              link: `/tasks/${task.id}`
            });
            notifSet.add(key);
          }
        }
      }

      if (notifsToCreate.length > 0) {
        prisma.notification.createMany({ data: notifsToCreate })
          .catch(err => console.warn('Could not batch create overdue notifications:', err.message));
      }
    }
  }

  async createTask(data, creator) {
    const {
      title,
      description,
      category = 'General',
      priority = 'MEDIUM',
      deadline,
      estimatedHours = 0,
      assignmentType = 'INDIVIDUAL',
      employeeId,
      employeeIds,
      targetDepartment,
      targetPosition,
      tags
    } = data;

    const targetEmployees = await this.resolveTargetEmployees({
      assignmentType,
      employeeId,
      employeeIds,
      targetDepartment,
      targetPosition
    });

    if (targetEmployees.length === 0) {
      const error = new Error(`No active employees found for assignment type '${assignmentType}'.`);
      error.statusCode = 400;
      throw error;
    }

    if (creator.role === 'MANAGER') {
      const managerDept = (creator.department || '').toLowerCase();
      if (['ALL', 'POSITION', 'MANAGERS', 'MANAGER'].includes(assignmentType.toUpperCase())) {
        const error = new Error(
          `Forbidden: Managers can only assign tasks to employees within their authorized department (${creator.department}). Organization-wide assignment strategies are reserved for Administrators.`
        );
        error.statusCode = 403;
        throw error;
      }

      if (assignmentType.toUpperCase() === 'DEPARTMENT') {
        if (!targetDepartment || targetDepartment.toLowerCase() !== managerDept) {
          const error = new Error(
            `Forbidden: Managers can only assign tasks to their authorized department (${creator.department}).`
          );
          error.statusCode = 403;
          throw error;
        }
      }

      const invalidEmployees = targetEmployees.filter(
        emp => (emp.department || '').toLowerCase() !== managerDept
      );
      if (invalidEmployees.length > 0) {
        const invalidNames = invalidEmployees.map(e => `${e.fullName} (${e.department})`).join(', ');
        const error = new Error(
          `Forbidden: Managers can only assign tasks to employees within their authorized department (${creator.department}). Target(s) outside your department: ${invalidNames}`
        );
        error.statusCode = 403;
        throw error;
      }
    }

    let targetValue = null;
    let finalAssignmentType = assignmentType.toUpperCase();
    if (finalAssignmentType === 'INDIVIDUAL') targetValue = employeeId;
    else if (finalAssignmentType === 'MULTIPLE') targetValue = employeeIds.join(', ');
    else if (finalAssignmentType === 'DEPARTMENT') targetValue = targetDepartment;
    else if (finalAssignmentType === 'POSITION') targetValue = targetPosition;
    else if (finalAssignmentType === 'ALL') targetValue = 'All Active Employees';
    else if (finalAssignmentType === 'MANAGERS' || finalAssignmentType === 'MANAGER') {
      finalAssignmentType = 'POSITION';
      targetValue = 'All Team Managers';
    }

    const finalCategory = creator.role === 'MANAGER' && creator.department ? creator.department : category;

    const createdTask = await prisma.$transaction(async (tx) => {
      return await tx.task.create({
        data: {
          title,
          description,
          category: finalCategory,
          priority: priority.toUpperCase(),
          status: 'PENDING',
          deadline: new Date(deadline),
          estimatedHours: Number(estimatedHours) || 0,
          assignmentType: finalAssignmentType,
          targetValue,
          tags: tags || null,
          createdBy: creator.employeeId || 'EMP009',
          assignments: {
            create: targetEmployees.map(emp => ({
              employeeId: emp.employeeId,
              status: 'PENDING',
              progress: 0
            }))
          },
          history: {
            create: {
              employeeId: creator.employeeId,
              action: 'TASK_CREATED',
              newStatus: 'PENDING',
              description: `Task created and assigned to ${targetEmployees.length} employee(s) via ${assignmentType} assignment by ${creator.fullName || creator.username}.`
            }
          }
        },
        include: {
          assignments: {
            include: { employee: true }
          }
        }
      });
    });

    this.invalidateTaskCaches();

    // Non-blocking audit log and notifications
    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          userId: creator.userId || creator.id,
          employeeId: creator.employeeId,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: createdTask.id,
          details: `Task "${title}" created with priority ${priority} by ${creator.fullName} [${creator.role}]`
        }
      }).catch(() => {});

      const assigneeIds = targetEmployees.map(e => e.employeeId);
      notificationService.createBulkNotifications(assigneeIds, {
        title: 'New Task Assigned',
        message: `You have been assigned to task "${title}" (Priority: ${priority}, Deadline: ${new Date(deadline).toLocaleDateString()}).`,
        type: 'TASK_ASSIGNED',
        category: 'TASK',
        entityType: 'TASK',
        entityId: createdTask.id,
        link: `/tasks/${createdTask.id}`
      }).catch(() => {});
    });

    return createdTask;
  }

  async getTasks(filters = {}) {
    this.refreshOverdueStatuses().catch(err => console.warn('Background overdue refresh error:', err.message));

    const {
      search,
      status,
      priority,
      category,
      department,
      position,
      employeeId,
      managerScope,
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = filters;

    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * pageSize;

    const cacheKey = `tasks_query_${JSON.stringify({ search, status, priority, category, department, position, employeeId, managerScope, sortBy, pageNum, pageSize })}`;

    return await cache.wrap(cacheKey, 60000, async () => {
      const params = [];
      const conditions = [];

      if (status && status !== 'ALL') {
        params.push(status.toUpperCase());
        conditions.push(`t.status::text = $${params.length}`);
      }
      if (priority && priority !== 'ALL') {
        params.push(priority.toUpperCase());
        conditions.push(`t.priority::text = $${params.length}`);
      }
      if (category && category !== 'ALL') {
        params.push(category);
        conditions.push(`LOWER(t.category) = LOWER($${params.length})`);
      }
      if (search && search.trim() !== '') {
        params.push(`%${search.trim()}%`);
        const p = `$${params.length}`;
        conditions.push(`(t.title ILIKE ${p} OR t.description ILIKE ${p} OR EXISTS (SELECT 1 FROM "TaskAssignment" ta_s LEFT JOIN "Employee" e_s ON e_s."employeeId" = ta_s."employeeId" WHERE ta_s."taskId" = t.id AND (ta_s."employeeId" ILIKE ${p} OR e_s."fullName" ILIKE ${p})))`);
      }
      if (employeeId && employeeId !== 'ALL') {
        params.push(employeeId);
        conditions.push(`EXISTS (SELECT 1 FROM "TaskAssignment" ta_e WHERE ta_e."taskId" = t.id AND ta_e."employeeId" = $${params.length})`);
      }
      if (department && department !== 'ALL') {
        params.push(department);
        conditions.push(`EXISTS (SELECT 1 FROM "TaskAssignment" ta_d JOIN "Employee" e_d ON e_d."employeeId" = ta_d."employeeId" WHERE ta_d."taskId" = t.id AND LOWER(e_d.department) = LOWER($${params.length}))`);
      }
      if (position && position !== 'ALL') {
        params.push(position);
        const p = `$${params.length}`;
        conditions.push(`EXISTS (SELECT 1 FROM "TaskAssignment" ta_p JOIN "Employee" e_p ON e_p."employeeId" = ta_p."employeeId" WHERE ta_p."taskId" = t.id AND (LOWER(e_p.position) = LOWER(${p}) OR LOWER(e_p.designation) = LOWER(${p})))`);
      }
      if (managerScope) {
        const { department: mgrDept, employeeId: mgrEmpId } = managerScope;
        params.push(mgrDept || '', mgrEmpId || '');
        const pDept = `$${params.length - 1}`;
        const pEmp = `$${params.length}`;
        conditions.push(`(LOWER(t.category) = LOWER(${pDept}) OR t."createdBy" = ${pEmp} OR EXISTS (SELECT 1 FROM "TaskAssignment" ta_m LEFT JOIN "Employee" e_m ON e_m."employeeId" = ta_m."employeeId" WHERE ta_m."taskId" = t.id AND (ta_m."employeeId" = ${pEmp} OR LOWER(e_m.department) = LOWER(${pDept}))))`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      let orderSql = 't."createdAt" DESC';
      if (sortBy === 'oldest') orderSql = 't."createdAt" ASC';
      else if (sortBy === 'deadline') orderSql = 't.deadline ASC';
      else if (sortBy === 'priority') orderSql = 't.priority::text DESC';
      else if (sortBy === 'status') orderSql = 't.status::text ASC';

      params.push(pageSize, skip);
      const sql = `
        SELECT
          t.id, t.title, t.description, t.category, t.priority::text AS priority,
          t.status::text AS status, t.deadline, t."estimatedHours",
          t."assignmentType"::text AS "assignmentType", t."targetValue",
          t."attachmentUrl", t.tags, t."createdBy", t."createdAt", t."updatedAt",
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ta.id,
                'taskId', ta."taskId",
                'employeeId', ta."employeeId",
                'status', ta.status::text,
                'progress', ta.progress,
                'assignedAt', ta."assignedAt",
                'startedAt', ta."startedAt",
                'completedAt', ta."completedAt",
                'updatedAt', ta."updatedAt",
                'employee', CASE WHEN e."employeeId" IS NOT NULL THEN
                  json_build_object(
                    'employeeId', e."employeeId",
                    'fullName', e."fullName",
                    'email', e.email,
                    'department', e.department,
                    'designation', e.designation,
                    'position', e.position
                  )
                ELSE NULL END
              )
            )
            FROM "TaskAssignment" ta
            LEFT JOIN "Employee" e ON e."employeeId" = ta."employeeId"
            WHERE ta."taskId" = t.id),
            '[]'::json
          ) AS assignments,
          json_build_object(
            'comments', (SELECT COUNT(*)::int FROM "TaskComment" tc WHERE tc."taskId" = t.id)
          ) AS "_count",
          COUNT(*) OVER()::int AS "_total"
        FROM "Task" t
        ${whereSql}
        ORDER BY ${orderSql}
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const rows = await prisma.$queryRawUnsafe(sql, ...params);
      const total = rows.length > 0 ? Number(rows[0]._total) : 0;
      const tasks = rows.map(({ _total, ...rest }) => rest);
      const totalPages = Math.ceil(total / pageSize) || 1;

      return {
        tasks,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      };
    });
  }

  async getTaskById(id) {
    this.refreshOverdueStatuses().catch(() => {});

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { employee: true }
        },
        comments: {
          orderBy: { createdAt: 'asc' }
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: { employeeId: true, fullName: true, department: true }
            }
          }
        }
      }
    });

    if (!task) {
      const error = new Error('Task not found.');
      error.statusCode = 404;
      throw error;
    }

    return task;
  }

  async updateTask(id, data, actor) {
    this.invalidateTaskCaches();
    const task = await this.getTaskById(id);

    if (actor.role === 'MANAGER') {
      const isCreator = task.createdBy === actor.employeeId;
      const inDept = task.category?.toLowerCase() === actor.department?.toLowerCase();
      if (!isCreator && !inDept) {
        const error = new Error(`Forbidden: Managers can only edit tasks within their authorized department (${actor.department}).`);
        error.statusCode = 403;
        throw error;
      }
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined) updateData.priority = data.priority.toUpperCase();
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.estimatedHours !== undefined) updateData.estimatedHours = Number(data.estimatedHours);
    if (data.tags !== undefined) updateData.tags = data.tags;

    const [updated] = await Promise.all([
      prisma.task.update({
        where: { id },
        data: updateData,
        include: { assignments: { include: { employee: true } } }
      }),
      prisma.taskHistory.create({
        data: {
          taskId: id,
          employeeId: actor.employeeId,
          action: 'TASK_UPDATED',
          description: `Task updated by ${actor.fullName || actor.employeeId}.`
        }
      })
    ]);

    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          userId: actor.userId || actor.id,
          employeeId: actor.employeeId,
          action: 'TASK_UPDATED',
          entityType: 'TASK',
          entityId: id,
          details: `Task updated by ${actor.fullName} [${actor.role}]`
        }
      }).catch(() => {});
    });

    return updated;
  }

  async deleteTask(id, actor) {
    this.invalidateTaskCaches();
    if (actor.role !== 'ADMIN') {
      const error = new Error('Forbidden: Only Administrators are permitted to permanently delete tasks.');
      error.statusCode = 403;
      throw error;
    }

    const task = await this.getTaskById(id);
    const deleted = await prisma.task.delete({ where: { id } });

    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          userId: actor.userId || actor.id,
          employeeId: actor.employeeId,
          action: 'TASK_DELETED',
          entityType: 'TASK',
          entityId: id,
          details: `Task "${task.title}" permanently deleted by Admin ${actor.fullName || actor.username}`
        }
      }).catch(() => {});
    });

    return deleted;
  }

  async updateTaskStatus(taskId, { status, progress }, actor) {
    this.invalidateTaskCaches();
    const task = await this.getTaskById(taskId);
    const newStatus = status.toUpperCase();
    const oldStatus = task.status;

    let progressNum = progress !== undefined ? Number(progress) : undefined;
    if (newStatus === 'COMPLETED') {
      progressNum = 100;
    }

    const now = new Date();

    if (actor.role === 'EMPLOYEE') {
      const myAssignment = task.assignments.find(a => a.employeeId === actor.employeeId);
      if (!myAssignment) {
        const error = new Error('Forbidden: You are not assigned to this task.');
        error.statusCode = 403;
        throw error;
      }

      await prisma.taskAssignment.update({
        where: { id: myAssignment.id },
        data: {
          status: newStatus,
          ...(progressNum !== undefined ? { progress: progressNum } : {}),
          ...(newStatus === 'IN_PROGRESS' && !myAssignment.startedAt ? { startedAt: now } : {}),
          ...(newStatus === 'COMPLETED' ? { completedAt: now } : {})
        }
      });

      const allAssignments = await prisma.taskAssignment.findMany({ where: { taskId } });
      const allCompleted = allAssignments.length > 0 && allAssignments.every(a => a.status === 'COMPLETED');
      const anyInProgress = allAssignments.some(a => a.status === 'IN_PROGRESS');

      let updatedTaskStatus = task.status;
      if (allCompleted) updatedTaskStatus = 'COMPLETED';
      else if (anyInProgress || newStatus === 'IN_PROGRESS') updatedTaskStatus = 'IN_PROGRESS';

      await prisma.task.update({ where: { id: taskId }, data: { status: updatedTaskStatus } });
    } else {
      if (actor.role === 'MANAGER') {
        const isCreator = task.createdBy === actor.employeeId;
        const inDept = task.category?.toLowerCase() === actor.department?.toLowerCase();
        const isAssigned = task.assignments.some(a => a.employeeId === actor.employeeId);
        if (!isCreator && !inDept && !isAssigned) {
          const error = new Error(
            `Forbidden: Managers can only update status for tasks within their department (${actor.department}).`
          );
          error.statusCode = 403;
          throw error;
        }
      }

      const assignmentUpdateData = {
        status: newStatus,
        ...(progressNum !== undefined ? { progress: progressNum } : {}),
        ...(newStatus === 'IN_PROGRESS' ? { startedAt: now } : {}),
        ...(newStatus === 'COMPLETED' ? { completedAt: now } : {})
      };

      await Promise.all([
        prisma.task.update({ where: { id: taskId }, data: { status: newStatus } }),
        prisma.taskAssignment.updateMany({ where: { taskId }, data: assignmentUpdateData })
      ]);
    }

    let desc = `Status changed from ${oldStatus} to ${newStatus}`;
    if (progressNum !== undefined) desc += ` (Progress: ${progressNum}%)`;
    desc += ` by ${actor.fullName || actor.employeeId}.`;

    await prisma.taskHistory.create({
      data: {
        taskId,
        employeeId: actor.employeeId,
        action: newStatus === 'COMPLETED' ? 'TASK_COMPLETED' : 'STATUS_UPDATED',
        oldStatus,
        newStatus,
        description: desc
      }
    });

    if (newStatus === 'COMPLETED' && task.createdBy && task.createdBy !== actor.employeeId) {
      setImmediate(() => {
        notificationService.createNotification({
          recipientId: task.createdBy,
          title: 'Task Completed',
          message: `Task "${task.title}" has been marked as COMPLETED by ${actor.fullName || actor.employeeId}.`,
          type: 'TASK_COMPLETED',
          category: 'TASK',
          entityType: 'TASK',
          entityId: taskId,
          link: `/tasks/${taskId}`
        }).catch(() => {});
      });
    }

    return await this.getTaskById(taskId);
  }

  async assignTask(taskId, data, actor) {
    this.invalidateTaskCaches();
    const task = await this.getTaskById(taskId);

    const {
      assignmentType = 'INDIVIDUAL',
      employeeId,
      employeeIds,
      targetDepartment,
      targetPosition
    } = data;

    const targetEmployees = await this.resolveTargetEmployees({
      assignmentType,
      employeeId,
      employeeIds,
      targetDepartment,
      targetPosition
    });

    if (targetEmployees.length === 0) {
      const error = new Error(`No active employees found for assignment type '${assignmentType}'.`);
      error.statusCode = 400;
      throw error;
    }

    if (actor.role === 'MANAGER') {
      const managerDept = (actor.department || '').toLowerCase();
      const isCreator = task.createdBy === actor.employeeId;
      const inDept = (task.category || '').toLowerCase() === managerDept;
      const hasDeptAssignee = task.assignments && task.assignments.some(
        a => (a.employee?.department || '').toLowerCase() === managerDept || a.employeeId === actor.employeeId
      );

      if (!isCreator && !inDept && !hasDeptAssignee) {
        const error = new Error(
          `Forbidden: Managers can only reassign tasks within their authorized department (${actor.department}).`
        );
        error.statusCode = 403;
        throw error;
      }

      if (['ALL', 'POSITION', 'MANAGERS', 'MANAGER'].includes(assignmentType.toUpperCase())) {
        const error = new Error(
          `Forbidden: Managers cannot perform organization-wide reassignments. Only team members in ${actor.department} can be assigned.`
        );
        error.statusCode = 403;
        throw error;
      }

      const invalidEmployees = targetEmployees.filter(
        emp => (emp.department || '').toLowerCase() !== managerDept
      );
      if (invalidEmployees.length > 0) {
        const invalidNames = invalidEmployees.map(e => `${e.fullName} (${e.department})`).join(', ');
        const error = new Error(
          `Forbidden: Managers can only assign tasks to employees within their authorized department (${actor.department}). Target(s) outside your department: ${invalidNames}`
        );
        error.statusCode = 403;
        throw error;
      }
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      for (const emp of targetEmployees) {
        const existingAssign = await tx.taskAssignment.findFirst({
          where: { taskId, employeeId: emp.employeeId }
        });
        if (existingAssign) {
          await tx.taskAssignment.update({
            where: { id: existingAssign.id },
            data: { status: task.status || 'PENDING' }
          });
        } else {
          await tx.taskAssignment.create({
            data: { taskId, employeeId: emp.employeeId, status: task.status || 'PENDING', progress: 0 }
          });
        }
      }

      await tx.taskHistory.create({
        data: {
          taskId,
          employeeId: actor.employeeId,
          action: 'TASK_REASSIGNED',
          description: `Task assigned/reassigned to ${targetEmployees.length} employee(s) (${targetEmployees.map(e => e.fullName).join(', ')}) via ${assignmentType} by ${actor.fullName || actor.employeeId} [${actor.role}].`
        }
      });

      return await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignments: { include: { employee: true } },
          history: { orderBy: { createdAt: 'desc' }, include: { employee: true } },
          comments: { orderBy: { createdAt: 'desc' }, include: { employee: true } }
        }
      });
    });

    setImmediate(() => {
      prisma.auditLog.create({
        data: {
          userId: actor.userId || actor.id,
          employeeId: actor.employeeId,
          action: 'TASK_REASSIGNED',
          entityType: 'TASK',
          entityId: taskId,
          details: `Task "${task.title}" reassigned to ${targetEmployees.map(e => `${e.fullName} (${e.employeeId})`).join(', ')} by ${actor.fullName || actor.name} [${actor.role}]`
        }
      }).catch(() => {});

      const empIds = targetEmployees.map(e => e.employeeId);
      notificationService.createBulkNotifications(empIds, {
        title: 'Task Assigned',
        message: `You have been assigned to task "${task.title}" (Priority: ${task.priority}).`,
        type: 'TASK_ASSIGNED',
        category: 'TASK',
        entityType: 'TASK',
        entityId: taskId,
        link: `/tasks/${taskId}`
      }).catch(() => {});
    });

    return updatedTask;
  }

  async getEmployeeTasks(employeeId, filters = {}) {
    this.refreshOverdueStatuses().catch(() => {});

    const { status, search, sortBy = 'newest' } = filters;
    const cacheKey = `my_tasks_${employeeId}_${JSON.stringify({ status, search, sortBy })}`;

    return await cache.wrap(cacheKey, 60000, async () => {
      const params = [employeeId];
      const conditions = [`ta."employeeId" = $1`];

      if (status && status !== 'ALL') {
        params.push(status.toUpperCase());
        conditions.push(`ta.status::text = $${params.length}`);
      }
      if (search && search.trim() !== '') {
        params.push(`%${search.trim()}%`);
        conditions.push(`t.title ILIKE $${params.length}`);
      }

      let orderSql = 't."createdAt" DESC';
      if (sortBy === 'deadline') orderSql = 't.deadline ASC';
      else if (sortBy === 'priority') orderSql = 't.priority::text DESC';

      const sql = `
        SELECT
          t.id, t.title, t.description, t.category, t.priority::text AS priority,
          t.status::text AS status, t.deadline, t."estimatedHours",
          t."assignmentType"::text AS "assignmentType", t."targetValue",
          t."attachmentUrl", t.tags, t."createdBy", t."createdAt", t."updatedAt",
          json_build_array(
            json_build_object(
              'id', ta.id,
              'taskId', ta."taskId",
              'employeeId', ta."employeeId",
              'status', ta.status::text,
              'progress', ta.progress,
              'assignedAt', ta."assignedAt",
              'startedAt', ta."startedAt",
              'completedAt', ta."completedAt",
              'updatedAt', ta."updatedAt",
              'employee', CASE WHEN e."employeeId" IS NOT NULL THEN row_to_json(e.*) ELSE NULL END
            )
          ) AS assignments,
          json_build_object(
            'comments', (SELECT COUNT(*)::int FROM "TaskComment" tc WHERE tc."taskId" = t.id)
          ) AS "_count",
          CASE WHEN cr."employeeId" IS NOT NULL THEN
            json_build_object('employeeId', cr."employeeId", 'fullName', cr."fullName", 'department', cr.department)
          ELSE json_build_object('fullName', t."createdBy", 'department', '') END AS creator
        FROM "Task" t
        JOIN "TaskAssignment" ta ON ta."taskId" = t.id
        LEFT JOIN "Employee" e ON e."employeeId" = ta."employeeId"
        LEFT JOIN "Employee" cr ON cr."employeeId" = t."createdBy"
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderSql}
      `;

      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async addComment(taskId, { comment }, actor) {
    await this.getTaskById(taskId);
    this.invalidateTaskCaches();

    const [newComment] = await Promise.all([
      prisma.taskComment.create({
        data: {
          taskId,
          employeeId: actor.employeeId,
          authorName: actor.fullName || actor.employeeId,
          comment
        }
      }),
      prisma.taskHistory.create({
        data: {
          taskId,
          employeeId: actor.employeeId,
          action: 'COMMENT_ADDED',
          description: `Comment added by ${actor.fullName || actor.employeeId}: "${comment.length > 60 ? comment.substring(0, 57) + '...' : comment}"`
        }
      })
    ]);

    return newComment;
  }

  async getTaskComments(taskId) {
    await this.getTaskById(taskId);

    return await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            designation: true
          }
        }
      }
    });
  }
}

module.exports = new TaskService();
