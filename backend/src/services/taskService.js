const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

class TaskService {
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
        where: {
          employeeId: { in: employeeIds },
          status: 'ACTIVE'
        }
      });
    }

    if (type === 'DEPARTMENT') {
      return await prisma.employee.findMany({
        where: {
          department: { equals: targetDepartment, mode: 'insensitive' },
          status: 'ACTIVE'
        }
      });
    }

    if (type === 'POSITION') {
      return await prisma.employee.findMany({
        where: {
          OR: [
            { position: { equals: targetPosition, mode: 'insensitive' } },
            { designation: { equals: targetPosition, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        }
      });
    }

    if (type === 'ALL') {
      return await prisma.employee.findMany({
        where: { status: 'ACTIVE' }
      });
    }

    return [];
  }

  async refreshOverdueStatuses() {
    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        deadline: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] }
      },
      select: { id: true, title: true }
    });

    if (overdueTasks.length > 0) {
      const taskIds = overdueTasks.map(t => t.id);
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { status: 'OVERDUE' }
      });

      await prisma.taskAssignment.updateMany({
        where: {
          taskId: { in: taskIds },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        },
        data: { status: 'OVERDUE' }
      });
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

    let targetValue = null;
    if (assignmentType === 'INDIVIDUAL') targetValue = employeeId;
    else if (assignmentType === 'MULTIPLE') targetValue = employeeIds.join(', ');
    else if (assignmentType === 'DEPARTMENT') targetValue = targetDepartment;
    else if (assignmentType === 'POSITION') targetValue = targetPosition;
    else if (assignmentType === 'ALL') targetValue = 'All Active Employees';

    const createdTask = await prisma.task.create({
      data: {
        title,
        description,
        category,
        priority: priority.toUpperCase(),
        status: 'PENDING',
        deadline: new Date(deadline),
        estimatedHours: Number(estimatedHours) || 0,
        assignmentType: assignmentType.toUpperCase(),
        targetValue,
        tags: tags || null,
        createdBy: creator.employeeId || 'EMP001',
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
            description: `Task created and assigned to ${targetEmployees.length} employee(s) via ${assignmentType} assignment.`
          }
        }
      },
      include: {
        assignments: {
          include: {
            employee: true
          }
        }
      }
    });

    const assigneeIds = targetEmployees.map(e => e.employeeId);
    await notificationService.createBulkNotifications(assigneeIds, {
      title: 'New Task Assigned',
      message: `You have been assigned to task "${title}" (Priority: ${priority}, Deadline: ${new Date(deadline).toLocaleDateString()}).`,
      type: 'TASK_ASSIGNED',
      link: `/tasks/${createdTask.id}`
    });

    return createdTask;
  }

  async getTasks(filters = {}) {
    await this.refreshOverdueStatuses();

    const {
      search,
      status,
      priority,
      category,
      department,
      position,
      employeeId,
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = filters;

    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * pageSize;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority.toUpperCase();
    }

    if (category && category !== 'ALL') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        {
          assignments: {
            some: {
              OR: [
                { employeeId: { contains: q, mode: 'insensitive' } },
                { employee: { fullName: { contains: q, mode: 'insensitive' } } }
              ]
            }
          }
        }
      ];
    }

    if (employeeId && employeeId !== 'ALL') {
      where.assignments = {
        some: { employeeId }
      };
    }

    if (department && department !== 'ALL') {
      where.assignments = {
        some: {
          employee: {
            department: { equals: department, mode: 'insensitive' }
          }
        }
      };
    }

    if (position && position !== 'ALL') {
      where.assignments = {
        some: {
          employee: {
            OR: [
              { position: { equals: position, mode: 'insensitive' } },
              { designation: { equals: position, mode: 'insensitive' } }
            ]
          }
        }
      };
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'deadline') orderBy = { deadline: 'asc' };
    else if (sortBy === 'priority') orderBy = { priority: 'desc' };
    else if (sortBy === 'status') orderBy = { status: 'asc' };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          assignments: {
            include: {
              employee: {
                select: {
                  employeeId: true,
                  fullName: true,
                  email: true,
                  department: true,
                  designation: true,
                  position: true
                }
              }
            }
          },
          _count: {
            select: { comments: true }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    return {
      tasks,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async getTaskById(id) {
    await this.refreshOverdueStatuses();

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            employee: true
          }
        },
        comments: {
          orderBy: { createdAt: 'asc' }
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                employeeId: true,
                fullName: true,
                department: true
              }
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
    await this.getTaskById(id);

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined) updateData.priority = data.priority.toUpperCase();
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.estimatedHours !== undefined) updateData.estimatedHours = Number(data.estimatedHours);
    if (data.tags !== undefined) updateData.tags = data.tags;

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: { employee: true }
        }
      }
    });

    await prisma.taskHistory.create({
      data: {
        taskId: id,
        employeeId: actor.employeeId,
        action: 'TASK_UPDATED',
        description: `Task updated by ${actor.fullName || actor.employeeId}.`
      }
    });

    return updated;
  }

  async deleteTask(id, actor) {
    await this.getTaskById(id);
    return await prisma.task.delete({
      where: { id }
    });
  }

  async updateTaskStatus(taskId, { status, progress }, actor) {
    const task = await this.getTaskById(taskId);
    const newStatus = status.toUpperCase();
    const oldStatus = task.status;

    let progressNum = progress !== undefined ? Number(progress) : undefined;
    if (newStatus === 'COMPLETED') {
      progressNum = 100;
    }

    const now = new Date();

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus
      }
    });

    const assignmentUpdateData = {
      status: newStatus,
      ...(progressNum !== undefined ? { progress: progressNum } : {}),
      ...(newStatus === 'IN_PROGRESS' ? { startedAt: now } : {}),
      ...(newStatus === 'COMPLETED' ? { completedAt: now } : {})
    };

    if (actor.role === 'ADMIN' || !actor.employeeId) {
      await prisma.taskAssignment.updateMany({
        where: { taskId },
        data: assignmentUpdateData
      });
    } else {
      await prisma.taskAssignment.updateMany({
        where: { taskId, employeeId: actor.employeeId },
        data: assignmentUpdateData
      });
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

    if (newStatus === 'COMPLETED') {
      if (task.createdBy && task.createdBy !== actor.employeeId) {
        await notificationService.createNotification({
          recipientId: task.createdBy,
          title: 'Task Completed',
          message: `Task "${task.title}" has been marked as COMPLETED by ${actor.fullName || actor.employeeId}.`,
          type: 'TASK_COMPLETED',
          link: `/tasks/${taskId}`
        });
      }
    }

    return await this.getTaskById(taskId);
  }

  async assignTask(taskId, data, actor) {
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

    for (const emp of targetEmployees) {
      await prisma.taskAssignment.upsert({
        where: {
          taskId_employeeId: {
            taskId,
            employeeId: emp.employeeId
          }
        },
        create: {
          taskId,
          employeeId: emp.employeeId,
          status: task.status || 'PENDING',
          progress: 0
        },
        update: {}
      });
    }

    await prisma.taskHistory.create({
      data: {
        taskId,
        employeeId: actor.employeeId,
        action: 'TASK_REASSIGNED',
        description: `Task assigned to ${targetEmployees.length} employee(s) via ${assignmentType} by ${actor.fullName || actor.employeeId}.`
      }
    });

    const empIds = targetEmployees.map(e => e.employeeId);
    await notificationService.createBulkNotifications(empIds, {
      title: 'Task Assigned',
      message: `You have been assigned to task "${task.title}" (Priority: ${task.priority}).`,
      type: 'TASK_ASSIGNED',
      link: `/tasks/${taskId}`
    });

    return await this.getTaskById(taskId);
  }

  async getEmployeeTasks(employeeId, filters = {}) {
    await this.refreshOverdueStatuses();

    const { status, search, sortBy = 'newest' } = filters;

    const where = {
      assignments: {
        some: { employeeId }
      }
    };

    if (status && status !== 'ALL') {
      where.assignments.some.status = status.toUpperCase();
    }

    if (search && search.trim() !== '') {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'deadline') orderBy = { deadline: 'asc' };
    if (sortBy === 'priority') orderBy = { priority: 'desc' };

    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        assignments: {
          where: { employeeId },
          include: {
            employee: true
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    return tasks;
  }

  async addComment(taskId, { comment }, actor) {
    await this.getTaskById(taskId);

    const newComment = await prisma.taskComment.create({
      data: {
        taskId,
        employeeId: actor.employeeId,
        authorName: actor.fullName || actor.employeeId,
        comment
      }
    });

    await prisma.taskHistory.create({
      data: {
        taskId,
        employeeId: actor.employeeId,
        action: 'COMMENT_ADDED',
        description: `Comment added by ${actor.fullName || actor.employeeId}: "${comment.length > 60 ? comment.substring(0, 57) + '...' : comment}"`
      }
    });

    return newComment;
  }
}

module.exports = new TaskService();
