import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type TicketListItem = {
  ticketid: number;
  subject: string;
  message: string | null;
  status: number;
  priority: number;
  department: number | null;
  service: number | null;
  userid: number | null;
  contactid: number | null;
  email: string | null;
  name: string | null;
  assigned: number | null;
  date: string | null;
  lastreply: string | null;
  adminread: number | null;
  clientread: number | null;
  project_id: number | null;
  ticketkey: string | null;
  // Joined fields
  department_name?: string;
  priority_name?: string;
  status_name?: string;
  assigned_name?: string;
};

export type TicketReply = {
  id: number;
  ticketid: number;
  userid: number | null;
  contactid: number | null;
  name: string | null;
  email: string | null;
  message: string;
  date: string;
  attachment: string | null;
  admin: number | null;
  submitter?: string;
  staff_name?: string;
  profile_image?: string;
};

export type TicketStatus = {
  ticketstatusid: number;
  name: string;
  statuscolor: string;
  statusorder: number;
  isdefault: number;
};

export type TicketPriority = {
  priorityid: number;
  name: string;
};

// ─── Filters ─────────────────────────────────────────────────────────────

export type TicketFilters = {
  status?: string;
  priority?: string;
  department?: string;
  search?: string;
  limit?: number;
};

// ─── Queries ─────────────────────────────────────────────────────────────

export function useTicketsList(filters?: TicketFilters) {
  return useQuery({
    queryKey: ["tickets", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.status) params.status = filters.status;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.department) params.department = filters.department;

      let endpoint = "tickets";
      if (filters?.search) {
        endpoint = `tickets/search/${encodeURIComponent(filters.search)}`;
      } else {
        const qs = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&");
        endpoint = `tickets?${qs}`;
      }
      const data = await apiRequest(endpoint);
      return normalizeList(data).items as TicketListItem[];
    },
    staleTime: 30 * 1000,
  });
}

export function useTicketDetail(id: string | number) {
  return useQuery({
    queryKey: ["tickets", "detail", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`tickets/${id}`);
      if (Array.isArray(data)) return data[0] as TicketListItem;
      if (data?.data) return (Array.isArray(data.data) ? data.data[0] : data.data) as TicketListItem;
      return data as TicketListItem;
    },
    enabled: !!id,
  });
}

export function useTicketReplies(ticketId: string | number) {
  return useQuery({
    queryKey: ["tickets", "replies", String(ticketId)],
    queryFn: async () => {
      try {
        const data = await apiRequest(`tickets/replies/${ticketId}`);
        return normalizeList(data).items as TicketReply[];
      } catch {
        return [] as TicketReply[];
      }
    },
    enabled: !!ticketId,
    staleTime: 15 * 1000,
  });
}

export function useTicketStatuses() {
  return useQuery({
    queryKey: ["tickets", "statuses"],
    queryFn: async () => {
      try {
        const data = await apiRequest("ticket_statuses");
        return normalizeList(data).items as TicketStatus[];
      } catch {
        return [] as TicketStatus[];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useTicketPriorities() {
  return useQuery({
    queryKey: ["tickets", "priorities"],
    queryFn: async () => {
      try {
        const data = await apiRequest("ticket_priorities");
        return normalizeList(data).items as TicketPriority[];
      } catch {
        return [] as TicketPriority[];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────

export function useReplyToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      isInternal,
    }: {
      ticketId: string | number;
      content: string;
      isInternal?: boolean;
    }) => {
      return apiRequest(`tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          content,
          ...(isInternal ? { internal: 1 } : {}),
        }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets", "detail", String(vars.ticketId)] });
      qc.invalidateQueries({ queryKey: ["tickets", "replies", String(vars.ticketId)] });
      qc.invalidateQueries({ queryKey: ["tickets", "list"] });
    },
  });
}

export function useChangeTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string | number; status: number }) => {
      return apiRequest(`tickets/${ticketId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["crud", "tickets"] });
    },
  });
}

export function useChangeTicketPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string | number; priority: number }) => {
      return apiRequest(`tickets/${ticketId}/priority`, {
        method: "PUT",
        body: JSON.stringify({ priority }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["crud", "tickets"] });
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, assigned }: { ticketId: string | number; assigned: number }) => {
      return apiRequest(`tickets/${ticketId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ assigned }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["crud", "tickets"] });
    },
  });
}
