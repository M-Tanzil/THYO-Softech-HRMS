
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getOvertimeRecords,
  approveOvertime,
  rejectOvertime,
  updateEmployeeOvertimeAuthorization,
  getEmployeesOvertimeAuthorization,
  getOvertimeRequests,
  createOvertimeRequest,
  approveOvertimeRequest,
  rejectOvertimeRequest,
} from "../api/overtimeApi";

export const overtimeKeys = {
  all: ["overtime"],
  lists: () => [...overtimeKeys.all, "list"],
  list: (params) => [...overtimeKeys.lists(), params],
  authorization: () => [...overtimeKeys.all, "authorization"],

  requests: () => [...overtimeKeys.all, "requests"],
  requestList: (params) => [...overtimeKeys.requests(), params],
};

export const useOvertimeRecords = (params = {}) => {
  return useQuery({
    queryKey: overtimeKeys.list(params),
    queryFn: () => getOvertimeRecords(params),
  });
};

export const useOvertimeRequests = (params = {}) => {
  return useQuery({
    queryKey: overtimeKeys.requestList(params),
    queryFn: () => getOvertimeRequests(params),
  });
};
export const useEmployeesOvertimeAuthorization = (enabled = true) => {
  return useQuery({
    queryKey: overtimeKeys.authorization(),
    queryFn: getEmployeesOvertimeAuthorization,
    enabled,
  });
};

export const useApproveOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveOvertime,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });
    },
  });
};

export const useRejectOvertime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectOvertime,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });
    },
  });
};

export const useUpdateOvertimeAuthorization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmployeeOvertimeAuthorization,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: overtimeKeys.authorization(),
      });
    },
  });
};
// New manual overtime request mutations
export const useCreateOvertimeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOvertimeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });
    },
  });
};

export const useApproveOvertimeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveOvertimeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });
    },
  });
};

export const useRejectOvertimeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectOvertimeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: overtimeKeys.all,
      });
    },
  });
};
