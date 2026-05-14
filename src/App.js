import { useState, useEffect, useCallback } from "react";

// ─── Utility helpers ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const isOverdue = (due) => due && new Date(due) < new Date() && new Date(due).toDateString() !== new Date().toDateString();

const ROLES = { ADMIN: "Admin", MEMBER: "Member" };
const STATUS = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "In Review", DONE: "Done" };
const PRIORITY = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };

const STATUS_COLOR = {
  "To Do": "#6366f1",
  "In Progress": "#f59e0b",
  "In Review": "#8b5cf6",
  "Done": "#10b981",
};
const PRIORITY_COLOR = {
  Low: "#10b981",
  Medium: "#3b82f6",
  High: "#f59e0b",
  Critical: "#ef4444",
};

// ─── Seed Data ─────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", name: "Arjun Sharma", email: "arjun@company.io", password: "admin123", role: ROLES.ADMIN, avatar: "AS" },
  { id: "u2", name: "Priya Nair", email: "priya@company.io", password: "member123", role: ROLES.MEMBER, avatar: "PN" },
  { id: "u3", name: "Rahul Verma", email: "rahul@company.io", password: "member123", role: ROLES.MEMBER, avatar: "RV" },
  { id: "u4", name: "Sneha Reddy", email: "sneha@company.io", password: "member123", role: ROLES.MEMBER, avatar: "SR" },
];

const SEED_PROJECTS = [
  { id: "p1", name: "Ethara AI Platform", description: "Build the core AI platform with ML pipelines and APIs.", createdBy: "u1", members: ["u1", "u2", "u3"], createdAt: now(), color: "#6366f1" },
  { id: "p2", name: "Mobile App Redesign", description: "Complete UI/UX overhaul of the mobile application.", createdBy: "u1", members: ["u1", "u2", "u4"], createdAt: now(), color: "#10b981" },
  { id: "p3", name: "Data Analytics Dashboard", description: "Real-time analytics and reporting dashboard.", createdBy: "u1", members: ["u1", "u3", "u4"], createdAt: now(), color: "#f59e0b" },
];

const SEED_TASKS = [
  { id: "t1", title: "Set up ML pipeline architecture", description: "Design and implement the core ML pipeline.", projectId: "p1", assigneeId: "u2", createdBy: "u1", status: STATUS.IN_PROGRESS, priority: PRIORITY.CRITICAL, due: "2025-05-20", createdAt: now(), tags: ["backend", "ml"] },
  { id: "t2", title: "API authentication layer", description: "Implement JWT-based auth with refresh tokens.", projectId: "p1", assigneeId: "u3", createdBy: "u1", status: STATUS.REVIEW, priority: PRIORITY.HIGH, due: "2025-05-16", createdAt: now(), tags: ["backend", "security"] },
  { id: "t3", title: "Design system tokens", description: "Create a comprehensive design token system.", projectId: "p2", assigneeId: "u2", createdBy: "u1", status: STATUS.TODO, priority: PRIORITY.MEDIUM, due: "2025-05-22", createdAt: now(), tags: ["design", "ui"] },
  { id: "t4", title: "Dashboard wireframes", description: "Create wireframes for all dashboard screens.", projectId: "p2", assigneeId: "u4", createdBy: "u1", status: STATUS.DONE, priority: PRIORITY.LOW, due: "2025-05-10", createdAt: now(), tags: ["design"] },
  { id: "t5", title: "Real-time data ingestion", description: "Build a Kafka-based data ingestion pipeline.", projectId: "p3", assigneeId: "u3", createdBy: "u1", status: STATUS.IN_PROGRESS, priority: PRIORITY.HIGH, due: "2025-05-12", createdAt: now(), tags: ["backend", "data"] },
  { id: "t6", title: "Chart component library", description: "Build reusable chart components with D3.", projectId: "p3", assigneeId: "u4", createdBy: "u1", status: STATUS.TODO, priority: PRIORITY.MEDIUM, due: "2025-05-25", createdAt: now(), tags: ["frontend"] },
  { id: "t7", title: "User onboarding flow", description: "End-to-end onboarding experience for new users.", projectId: "p1", assigneeId: "u4", createdBy: "u2", status: STATUS.TODO, priority: PRIORITY.HIGH, due: "2025-05-08", createdAt: now(), tags: ["ux", "frontend"] },
];

// ─── Storage (simulated DB) ────────────────────────────────────────────────
const DB = {
  users: [...SEED_USERS],
  projects: [...SEED_PROJECTS],
  tasks: [...SEED_TASKS],
};

// ─── Avatar Component ──────────────────────────────────────────────────────
const Avatar = ({ initials, size = 32, color = "#6366f1" }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: color + "22", border: `1.5px solid ${color}44`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.35, fontWeight: 600, color, flexShrink: 0,
    fontFamily: "monospace", letterSpacing: 0.5,
  }}>{initials}</div>
);

// ─── Badge ─────────────────────────────────────────────────────────────────
const Badge = ({ label, color, size = "sm" }) => {
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}30`,
      borderRadius: 100, padding: size === "sm" ? "2px 8px" : "3px 10px",
      fontSize: fs, fontWeight: 600, whiteSpace: "nowrap", letterSpacing: 0.3,
    }}>{label}</span>
  );
};

// ─── Modal ─────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, width = 520 }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: "#0f0f18", border: "1px solid #2a2a3d", borderRadius: 16,
      width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f1f1f5" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: "16px 24px 24px" }}>{children}</div>
    </div>
  </div>
);

// ─── Form Field ────────────────────────────────────────────────────────────
const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width: "100%", padding: "10px 12px", background: "#1a1a2e",
    border: "1px solid #2a2a3d", borderRadius: 8, color: "#f1f1f5",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    ...props.style,
  }} />
);

const Select = ({ children, ...props }) => (
  <select {...props} style={{
    width: "100%", padding: "10px 12px", background: "#1a1a2e",
    border: "1px solid #2a2a3d", borderRadius: 8, color: "#f1f1f5",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    ...props.style,
  }}>{children}</select>
);

const Textarea = (props) => (
  <textarea {...props} style={{
    width: "100%", padding: "10px 12px", background: "#1a1a2e",
    border: "1px solid #2a2a3d", borderRadius: 8, color: "#f1f1f5",
    fontSize: 14, outline: "none", resize: "vertical", minHeight: 80,
    boxSizing: "border-box", fontFamily: "inherit",
    ...props.style,
  }} />
);

// ─── Sidebar ───────────────────────────────────────────────────────────────
const Sidebar = ({ user, view, setView, projects, onLogout }) => {
  const isAdmin = user.role === ROLES.ADMIN;
  const navItems = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "projects", icon: "◈", label: "Projects" },
    { id: "tasks", icon: "✦", label: "My Tasks" },
    ...(isAdmin ? [{ id: "team", icon: "⬟", label: "Team" }] : []),
  ];

  return (
    <aside style={{
      width: 220, background: "#080810", borderRight: "1px solid #1c1c2a",
      display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0,
      position: "sticky", top: 0,
    }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1c1c2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f1f5", letterSpacing: -0.3 }}>TaskForge</div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, letterSpacing: 1 }}>TEAM · OS</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b4b6a", letterSpacing: 1.5, padding: "8px 8px 4px", textTransform: "uppercase" }}>Navigate</div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "9px 10px", marginBottom: 2, borderRadius: 8,
            background: view === item.id ? "#6366f115" : "transparent",
            border: view === item.id ? "1px solid #6366f130" : "1px solid transparent",
            color: view === item.id ? "#818cf8" : "#8888aa",
            cursor: "pointer", fontSize: 13, fontWeight: view === item.id ? 600 : 500,
            transition: "all 0.15s", textAlign: "left",
          }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        {projects.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4b4b6a", letterSpacing: 1.5, padding: "16px 8px 4px", textTransform: "uppercase" }}>Projects</div>
            {projects.map(p => (
              <button key={p.id} onClick={() => setView("project-" + p.id)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 10px", marginBottom: 2, borderRadius: 8,
                background: view === "project-" + p.id ? "#6366f115" : "transparent",
                border: "1px solid transparent", color: "#7878a0",
                cursor: "pointer", fontSize: 12, fontWeight: 500, textAlign: "left",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #1c1c2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar initials={user.avatar} size={34} color="#6366f1" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#d1d1e0", lineHeight: 1.2 }}>{user.name.split(" ")[0]}</div>
            <Badge label={user.role} color={user.role === ROLES.ADMIN ? "#f59e0b" : "#10b981"} />
          </div>
        </div>
        <button onClick={onLogout} style={{
          width: "100%", padding: "8px", borderRadius: 8, background: "transparent",
          border: "1px solid #2a2a3d", color: "#666688", cursor: "pointer", fontSize: 12, fontWeight: 500,
        }}>Sign Out</button>
      </div>
    </aside>
  );
};

// ─── Task Card ─────────────────────────────────────────────────────────────
const TaskCard = ({ task, users, projects, onClick }) => {
  const assignee = users.find(u => u.id === task.assigneeId);
  const project = projects.find(p => p.id === task.projectId);
  const overdue = isOverdue(task.due);

  return (
    <div onClick={onClick} style={{
      background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 12,
      padding: "14px 16px", cursor: "pointer", transition: "all 0.15s",
      borderLeft: `3px solid ${PRIORITY_COLOR[task.priority]}`,
      marginBottom: 8,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a2a4a"; e.currentTarget.style.background = "#12121f"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1c1c2a"; e.currentTarget.style.background = "#0f0f18"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#d1d1e0", lineHeight: 1.4, flex: 1 }}>{task.title}</div>
        <Badge label={task.status} color={STATUS_COLOR[task.status]} />
      </div>
      {task.description && (
        <div style={{ fontSize: 12, color: "#6666a0", marginBottom: 10, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {task.description}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {project && <span style={{ fontSize: 11, color: "#7878a0", background: project.color + "18", padding: "2px 7px", borderRadius: 100, fontWeight: 500 }}>{project.name.split(" ")[0]}</span>}
          <Badge label={task.priority} color={PRIORITY_COLOR[task.priority]} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {task.due && (
            <span style={{ fontSize: 11, color: overdue ? "#ef4444" : "#6666a0", fontWeight: overdue ? 600 : 400 }}>
              {overdue ? "⚠ " : ""}Due {fmt(task.due)}
            </span>
          )}
          {assignee && <Avatar initials={assignee.avatar} size={22} color="#6366f1" />}
        </div>
      </div>
    </div>
  );
};

// ─── Task Form Modal ───────────────────────────────────────────────────────
const TaskFormModal = ({ task, projects, users, currentUser, onSave, onClose }) => {
  const isAdmin = currentUser.role === ROLES.ADMIN;
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    projectId: task?.projectId || projects[0]?.id || "",
    assigneeId: task?.assigneeId || "",
    status: task?.status || STATUS.TODO,
    priority: task?.priority || PRIORITY.MEDIUM,
    due: task?.due || "",
    tags: task?.tags?.join(", ") || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return alert("Title is required");
    if (!form.projectId) return alert("Project is required");
    const savedTask = {
      ...task,
      id: task?.id || uid(),
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdBy: task?.createdBy || currentUser.id,
      createdAt: task?.createdAt || now(),
    };
    onSave(savedTask);
  };

  const availableMembers = form.projectId
    ? users.filter(u => projects.find(p => p.id === form.projectId)?.members?.includes(u.id))
    : users;

  return (
    <Modal title={task ? "Edit Task" : "New Task"} onClose={onClose}>
      <Field label="Title" required><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?" /></Field>
      <Field label="Description"><Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the task..." /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Project" required>
          <Select value={form.projectId} onChange={e => set("projectId", e.target.value)}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Assignee">
          <Select value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}>
            <option value="">Unassigned</option>
            {availableMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={e => set("status", e.target.value)}>
            {Object.values(STATUS).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={e => set("priority", e.target.value)}>
            {Object.values(PRIORITY).map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Due Date"><Input type="date" value={form.due} onChange={e => set("due", e.target.value)} /></Field>
      <Field label="Tags (comma separated)"><Input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="backend, ui, urgent" /></Field>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #2a2a3d", borderRadius: 8, color: "#7878a0", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
        <button onClick={handleSave} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          {task ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </Modal>
  );
};

// ─── Project Form Modal ────────────────────────────────────────────────────
const ProjectFormModal = ({ project, users, currentUser, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    members: project?.members || [currentUser.id],
    color: project?.color || "#6366f1",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleMember = (id) => set("members", form.members.includes(id) ? form.members.filter(m => m !== id) : [...form.members, id]);

  const handleSave = () => {
    if (!form.name.trim()) return alert("Project name required");
    onSave({ ...project, id: project?.id || uid(), ...form, createdBy: project?.createdBy || currentUser.id, createdAt: project?.createdAt || now() });
  };

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

  return (
    <Modal title={project ? "Edit Project" : "New Project"} onClose={onClose}>
      <Field label="Project Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Project name" /></Field>
      <Field label="Description"><Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What is this project about?" /></Field>
      <Field label="Color">
        <div style={{ display: "flex", gap: 8 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => set("color", c)} style={{
              width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
              border: form.color === c ? `3px solid #fff` : "2px solid transparent",
              boxSizing: "border-box", transition: "transform 0.1s",
              transform: form.color === c ? "scale(1.1)" : "scale(1)",
            }} />
          ))}
        </div>
      </Field>
      <Field label="Team Members">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map(u => (
            <div key={u.id} onClick={() => u.id !== currentUser.id && toggleMember(u.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
              background: form.members.includes(u.id) ? "#6366f115" : "#1a1a2e",
              border: `1px solid ${form.members.includes(u.id) ? "#6366f140" : "#2a2a3d"}`,
              cursor: u.id !== currentUser.id ? "pointer" : "default",
            }}>
              <Avatar initials={u.avatar} size={28} color="#6366f1" />
              <div style={{ flex: 1, fontSize: 13, color: "#c1c1d5", fontWeight: 500 }}>{u.name}</div>
              <Badge label={u.role} color={u.role === ROLES.ADMIN ? "#f59e0b" : "#10b981"} />
              {form.members.includes(u.id) && <span style={{ color: "#6366f1", fontSize: 14 }}>✓</span>}
            </div>
          ))}
        </div>
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #2a2a3d", borderRadius: 8, color: "#7878a0", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={handleSave} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          {project ? "Save Changes" : "Create Project"}
        </button>
      </div>
    </Modal>
  );
};

// ─── Task Detail Modal ─────────────────────────────────────────────────────
const TaskDetailModal = ({ task, users, projects, currentUser, onClose, onEdit, onDelete, onStatusChange }) => {
  const assignee = users.find(u => u.id === task.assigneeId);
  const creator = users.find(u => u.id === task.createdBy);
  const project = projects.find(p => p.id === task.projectId);
  const isAdmin = currentUser.role === ROLES.ADMIN;
  const canEdit = isAdmin || task.createdBy === currentUser.id || task.assigneeId === currentUser.id;
  const overdue = isOverdue(task.due);

  return (
    <Modal title="" onClose={onClose} width={560}>
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f1f5", lineHeight: 1.3 }}>{task.title}</h2>
          {canEdit && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={onEdit} style={{ padding: "6px 12px", background: "#1a1a2e", border: "1px solid #2a2a3d", borderRadius: 6, color: "#9090b8", cursor: "pointer", fontSize: 12 }}>Edit</button>
              {isAdmin && <button onClick={onDelete} style={{ padding: "6px 12px", background: "#ef444415", border: "1px solid #ef444430", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Delete</button>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <Badge label={task.status} color={STATUS_COLOR[task.status]} size="md" />
          <Badge label={task.priority} color={PRIORITY_COLOR[task.priority]} size="md" />
          {overdue && <Badge label="Overdue" color="#ef4444" size="md" />}
          {task.tags?.map(tag => <Badge key={tag} label={tag} color="#7878a0" size="md" />)}
        </div>

        {task.description && (
          <div style={{ background: "#1a1a2e", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#9090b8", lineHeight: 1.6 }}>
            {task.description}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Project", value: project?.name, color: project?.color },
            { label: "Due Date", value: fmt(task.due), alert: overdue },
            { label: "Assignee", value: assignee?.name || "Unassigned" },
            { label: "Created By", value: creator?.name },
            { label: "Created", value: fmt(task.createdAt) },
          ].map(({ label, value, color, alert }) => (
            <div key={label} style={{ background: "#1a1a2e", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "#5555a0", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: alert ? "#ef4444" : color || "#c1c1d5", fontWeight: 500 }}>{value || "—"}</div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div>
            <div style={{ fontSize: 11, color: "#5555a0", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Change Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.values(STATUS).map(s => (
                <button key={s} onClick={() => onStatusChange(task.id, s)} style={{
                  padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: task.status === s ? STATUS_COLOR[s] + "30" : "transparent",
                  border: `1px solid ${task.status === s ? STATUS_COLOR[s] : "#2a2a3d"}`,
                  color: task.status === s ? STATUS_COLOR[s] : "#6666a0", cursor: "pointer",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── Dashboard View ────────────────────────────────────────────────────────
const DashboardView = ({ user, tasks, projects, users, onTaskClick, onNewTask }) => {
  const isAdmin = user.role === ROLES.ADMIN;
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assigneeId === user.id || t.createdBy === user.id);
  const overdueTasks = myTasks.filter(t => isOverdue(t.due) && t.status !== STATUS.DONE);
  const doneTasks = myTasks.filter(t => t.status === STATUS.DONE);
  const inProgressTasks = myTasks.filter(t => t.status === STATUS.IN_PROGRESS);

  const statusGroups = Object.values(STATUS).map(s => ({
    status: s,
    count: myTasks.filter(t => t.status === s).length,
    color: STATUS_COLOR[s],
  }));

  const recentTasks = [...myTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const Stat = ({ label, value, color, sub }) => (
    <div style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "#5555a0", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#f1f1f5", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#5555a0", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f5" }}>
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {user.name.split(" ")[0]} 👋
          </h1>
          <div style={{ fontSize: 13, color: "#6666a0", marginTop: 4 }}>Here's what's happening across your projects</div>
        </div>
        <button onClick={onNewTask} style={{
          padding: "10px 18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
          borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>＋ New Task</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Total Tasks" value={myTasks.length} sub={`${isAdmin ? "All tasks" : "Assigned to you"}`} />
        <Stat label="In Progress" value={inProgressTasks.length} color="#f59e0b" sub="Currently active" />
        <Stat label="Completed" value={doneTasks.length} color="#10b981" sub={`${myTasks.length > 0 ? Math.round((doneTasks.length / myTasks.length) * 100) : 0}% completion`} />
        <Stat label="Overdue" value={overdueTasks.length} color={overdueTasks.length > 0 ? "#ef4444" : "#10b981"} sub={overdueTasks.length > 0 ? "Needs attention" : "You're on track!"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#9090b8", letterSpacing: 0.5 }}>STATUS BREAKDOWN</h3>
          <div style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 12, padding: 16 }}>
            {statusGroups.map(sg => (
              <div key={sg.status} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#9090b8", fontWeight: 500 }}>{sg.status}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sg.color }}>{sg.count}</span>
                </div>
                <div style={{ height: 6, background: "#1c1c2a", borderRadius: 100, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${myTasks.length > 0 ? (sg.count / myTasks.length) * 100 : 0}%`,
                    background: sg.color, borderRadius: 100, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {projects.length > 0 && (
            <>
              <h3 style={{ margin: "16px 0 12px", fontSize: 14, fontWeight: 700, color: "#9090b8", letterSpacing: 0.5 }}>PROJECTS</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(isAdmin ? projects : projects.filter(p => p.members.includes(user.id))).slice(0, 3).map(p => {
                  const pTasks = tasks.filter(t => t.projectId === p.id);
                  const pDone = pTasks.filter(t => t.status === STATUS.DONE).length;
                  const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
                  return (
                    <div key={p.id} style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#c1c1d5" }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "#6666a0" }}>{pDone}/{pTasks.length}</span>
                      </div>
                      <div style={{ height: 4, background: "#1c1c2a", borderRadius: 100 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: p.color, borderRadius: 100 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#9090b8", letterSpacing: 0.5 }}>RECENT TASKS</h3>
          <div>
            {recentTasks.length === 0
              ? <div style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 12, padding: "32px 16px", textAlign: "center", color: "#4444a0", fontSize: 13 }}>No tasks yet. Create one!</div>
              : recentTasks.map(t => <TaskCard key={t.id} task={t} users={users} projects={projects} onClick={() => onTaskClick(t)} />)}
          </div>

          {overdueTasks.length > 0 && (
            <>
              <h3 style={{ margin: "16px 0 12px", fontSize: 14, fontWeight: 700, color: "#ef4444", letterSpacing: 0.5 }}>⚠ OVERDUE</h3>
              {overdueTasks.slice(0, 3).map(t => <TaskCard key={t.id} task={t} users={users} projects={projects} onClick={() => onTaskClick(t)} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Projects View ─────────────────────────────────────────────────────────
const ProjectsView = ({ user, tasks, projects, users, setView, onNewProject, onEditProject, onDeleteProject }) => {
  const isAdmin = user.role === ROLES.ADMIN;
  const myProjects = isAdmin ? projects : projects.filter(p => p.members.includes(user.id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f5" }}>Projects</h1>
          <div style={{ fontSize: 13, color: "#6666a0", marginTop: 4 }}>{myProjects.length} active project{myProjects.length !== 1 ? "s" : ""}</div>
        </div>
        {isAdmin && (
          <button onClick={onNewProject} style={{
            padding: "10px 18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
            borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
          }}>＋ New Project</button>
        )}
      </div>

      {myProjects.length === 0
        ? <div style={{ textAlign: "center", padding: 60, color: "#4444a0" }}>No projects yet. {isAdmin ? "Create one above!" : "Ask your admin to add you to a project."}</div>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {myProjects.map(p => {
              const pTasks = tasks.filter(t => t.projectId === p.id);
              const pDone = pTasks.filter(t => t.status === STATUS.DONE).length;
              const pOverdue = pTasks.filter(t => isOverdue(t.due) && t.status !== STATUS.DONE).length;
              const pMembers = users.filter(u => p.members.includes(u.id));
              const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

              return (
                <div key={p.id} style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                  onClick={() => setView("project-" + p.id)}>
                  <div style={{ height: 5, background: p.color }} />
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f1f5", lineHeight: 1.3 }}>{p.name}</h3>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => onEditProject(p)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid #2a2a3d", borderRadius: 5, color: "#7878a0", cursor: "pointer", fontSize: 11 }}>Edit</button>
                          <button onClick={() => onDeleteProject(p.id)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid #ef444430", borderRadius: 5, color: "#ef4444", cursor: "pointer", fontSize: 11 }}>Del</button>
                        </div>
                      )}
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: 12, color: "#6666a0", lineHeight: 1.5 }}>{p.description}</p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: "#9090b8" }}>{pDone}/{pTasks.length} tasks · {pct}%</span>
                      {pOverdue > 0 && <Badge label={`${pOverdue} overdue`} color="#ef4444" />}
                    </div>
                    <div style={{ height: 5, background: "#1c1c2a", borderRadius: 100, marginBottom: 14 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: p.color, borderRadius: 100 }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex" }}>
                        {pMembers.slice(0, 4).map((m, i) => (
                          <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i, position: "relative" }}>
                            <Avatar initials={m.avatar} size={26} color="#6366f1" />
                          </div>
                        ))}
                        {pMembers.length > 4 && <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1c1c2a", border: "1.5px solid #6366f120", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#6666a0", marginLeft: -8 }}>+{pMembers.length - 4}</div>}
                      </div>
                      <span style={{ fontSize: 11, color: "#4444a0" }}>Created {fmt(p.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

// ─── Project Detail View ───────────────────────────────────────────────────
const ProjectDetailView = ({ projectId, user, tasks, projects, users, onTaskClick, onNewTask }) => {
  const project = projects.find(p => p.id === projectId);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  if (!project) return <div style={{ color: "#ef4444", padding: 40 }}>Project not found.</div>;

  const pTasks = tasks.filter(t => t.projectId === projectId);
  const filtered = pTasks.filter(t => {
    const matchStatus = filter === "all" || t.status === filter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const byStatus = Object.values(STATUS).map(s => ({ status: s, tasks: filtered.filter(t => t.status === s) }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 40, borderRadius: 4, background: project.color }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f5" }}>{project.name}</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6666a0" }}>{project.description}</p>
          </div>
        </div>
        <button onClick={onNewTask} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>＋ Task</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ width: 220, padding: "8px 12px" }} />
        <div style={{ display: "flex", gap: 6 }}>
          {["all", ...Object.values(STATUS)].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: filter === s ? "#6366f120" : "transparent",
              border: `1px solid ${filter === s ? "#6366f140" : "#2a2a3d"}`,
              color: filter === s ? "#818cf8" : "#7070a0", cursor: "pointer",
            }}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {byStatus.map(({ status, tasks: sTasks }) => (
          <div key={status}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 0" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[status] }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9090b8", letterSpacing: 0.5 }}>{status.toUpperCase()}</span>
              <span style={{ fontSize: 12, color: "#4444a0", marginLeft: "auto" }}>{sTasks.length}</span>
            </div>
            <div style={{ minHeight: 60 }}>
              {sTasks.map(t => <TaskCard key={t.id} task={t} users={users} projects={projects} onClick={() => onTaskClick(t)} />)}
              {sTasks.length === 0 && (
                <div style={{ border: "1px dashed #1c1c2a", borderRadius: 10, padding: "20px 12px", textAlign: "center", fontSize: 12, color: "#3333a0" }}>Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── My Tasks View ─────────────────────────────────────────────────────────
const MyTasksView = ({ user, tasks, projects, users, onTaskClick, onNewTask }) => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due");
  const [search, setSearch] = useState("");
  const isAdmin = user.role === ROLES.ADMIN;

  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assigneeId === user.id || t.createdBy === user.id);

  const filtered = myTasks.filter(t => {
    const matchStatus = filter === "all" || t.status === filter || (filter === "overdue" && isOverdue(t.due) && t.status !== STATUS.DONE);
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "due") return new Date(a.due || "9999") - new Date(b.due || "9999");
    if (sortBy === "priority") {
      const order = [PRIORITY.CRITICAL, PRIORITY.HIGH, PRIORITY.MEDIUM, PRIORITY.LOW];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f1f5" }}>{isAdmin ? "All Tasks" : "My Tasks"}</h1>
          <div style={{ fontSize: 13, color: "#6666a0", marginTop: 4 }}>{filtered.length} tasks</div>
        </div>
        <button onClick={onNewTask} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>＋ New Task</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ width: 220, padding: "8px 12px" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "overdue", ...Object.values(STATUS)].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: filter === s ? "#6366f120" : "transparent",
              border: `1px solid ${filter === s ? "#6366f140" : "#2a2a3d"}`,
              color: filter === s ? (s === "overdue" ? "#ef4444" : "#818cf8") : "#7070a0", cursor: "pointer",
            }}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 140, padding: "7px 10px" }}>
          <option value="due">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
        </Select>
      </div>

      {sorted.length === 0
        ? <div style={{ textAlign: "center", padding: 60, color: "#4444a0" }}>No tasks found.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
          {sorted.map(t => <TaskCard key={t.id} task={t} users={users} projects={projects} onClick={() => onTaskClick(t)} />)}
        </div>
      }
    </div>
  );
};

// ─── Team View (Admin Only) ────────────────────────────────────────────────
const TeamView = ({ users, tasks, projects }) => {
  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#f1f1f5" }}>Team</h1>
      <div style={{ fontSize: 13, color: "#6666a0", marginBottom: 24 }}>{users.length} members</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {users.map(u => {
          const uTasks = tasks.filter(t => t.assigneeId === u.id);
          const uDone = uTasks.filter(t => t.status === STATUS.DONE).length;
          const uOverdue = uTasks.filter(t => isOverdue(t.due) && t.status !== STATUS.DONE).length;
          const uProjects = projects.filter(p => p.members.includes(u.id));

          return (
            <div key={u.id} style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 14, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Avatar initials={u.avatar} size={44} color="#6366f1" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f1f5" }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "#6666a0" }}>{u.email}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <Badge label={u.role} color={u.role === ROLES.ADMIN ? "#f59e0b" : "#10b981"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Assigned", value: uTasks.length, color: "#6366f1" },
                  { label: "Done", value: uDone, color: "#10b981" },
                  { label: "Overdue", value: uOverdue, color: uOverdue > 0 ? "#ef4444" : "#5555a0" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#1a1a2e", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: "#5555a0", fontWeight: 600, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: "#5555a0", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>PROJECTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {uProjects.length === 0
                  ? <span style={{ fontSize: 12, color: "#3333a0" }}>No projects</span>
                  : uProjects.map(p => <span key={p.id} style={{ fontSize: 11, background: p.color + "20", color: p.color, padding: "3px 8px", borderRadius: 100, fontWeight: 500 }}>{p.name.split(" ")[0]}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Login Screen ──────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("login");
  const [reg, setReg] = useState({ name: "", email: "", password: "", role: ROLES.MEMBER });

  const handleLogin = () => {
    const user = DB.users.find(u => u.email === email && u.password === password);
    if (!user) { setError("Invalid email or password."); return; }
    setError("");
    onLogin(user);
  };

  const handleRegister = () => {
    if (!reg.name || !reg.email || !reg.password) { setError("All fields are required."); return; }
    if (DB.users.find(u => u.email === reg.email)) { setError("Email already registered."); return; }
    const newUser = { id: uid(), avatar: reg.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(), ...reg };
    DB.users.push(newUser);
    setError("");
    onLogin(newUser);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#08080f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>⬡</div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900, color: "#f1f1f5", letterSpacing: -0.5 }}>TaskForge</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#5555a0" }}>Team Task Management Platform</p>
        </div>

        <div style={{ background: "#0f0f18", border: "1px solid #1c1c2a", borderRadius: 16, padding: "28px 28px" }}>
          <div style={{ display: "flex", marginBottom: 24, background: "#1a1a2e", borderRadius: 10, padding: 4 }}>
            {["login", "signup"].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
                flex: 1, padding: "8px", border: "none", borderRadius: 7, cursor: "pointer",
                background: tab === t ? "#6366f1" : "transparent",
                color: tab === t ? "#fff" : "#5555a0", fontWeight: 600, fontSize: 13,
                transition: "all 0.2s",
              }}>{t === "login" ? "Sign In" : "Sign Up"}</button>
            ))}
          </div>

          {tab === "login" ? (
            <>
              <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.io" /></Field>
              <Field label="Password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button onClick={handleLogin} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Sign In</button>
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#1a1a2e", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#5555a0", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>DEMO ACCOUNTS</div>
                {[
                  { label: "Admin", email: "arjun@company.io", pw: "admin123", color: "#f59e0b" },
                  { label: "Member", email: "priya@company.io", pw: "member123", color: "#10b981" },
                ].map(a => (
                  <div key={a.label} onClick={() => { setEmail(a.email); setPassword(a.pw); }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
                    <Badge label={a.label} color={a.color} />
                    <span style={{ fontSize: 12, color: "#7070a0" }}>{a.email} / {a.pw}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <Field label="Full Name"><Input value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} placeholder="Your full name" /></Field>
              <Field label="Email"><Input type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} placeholder="you@company.io" /></Field>
              <Field label="Password"><Input type="password" value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} placeholder="Choose a password" /></Field>
              <Field label="Role">
                <Select value={reg.role} onChange={e => setReg(r => ({ ...r, role: e.target.value }))}>
                  <option value={ROLES.MEMBER}>Member</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </Select>
              </Field>
              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button onClick={handleRegister} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Create Account</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [users, setUsers] = useState(DB.users);
  const [projects, setProjects] = useState(DB.projects);
  const [tasks, setTasks] = useState(DB.tasks);

  // Modals
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task
  const [editTaskModal, setEditTaskModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [editProjectModal, setEditProjectModal] = useState(null);
  const [taskDetailModal, setTaskDetailModal] = useState(null);

  const isAdmin = currentUser?.role === ROLES.ADMIN;

  const myProjects = currentUser
    ? (isAdmin ? projects : projects.filter(p => p.members.includes(currentUser.id)))
    : [];

  const handleSaveTask = (task) => {
    if (tasks.find(t => t.id === task.id)) {
      setTasks(ts => ts.map(t => t.id === task.id ? task : t));
    } else {
      setTasks(ts => [...ts, task]);
    }
    setTaskModal(null);
    setEditTaskModal(null);
    if (taskDetailModal?.id === task.id) setTaskDetailModal(task);
  };

  const handleDeleteTask = (id) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    setTaskDetailModal(null);
  };

  const handleStatusChange = (id, status) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
    setTaskDetailModal(prev => prev && prev.id === id ? { ...prev, status } : prev);
  };

  const handleSaveProject = (project) => {
    if (projects.find(p => p.id === project.id)) {
      setProjects(ps => ps.map(p => p.id === project.id ? project : p));
    } else {
      setProjects(ps => [...ps, project]);
    }
    setProjectModal(null);
    setEditProjectModal(null);
  };

  const handleDeleteProject = (id) => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    setProjects(ps => ps.filter(p => p.id !== id));
    setTasks(ts => ts.filter(t => t.projectId !== id));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("dashboard");
  };

  const openNewTask = (defaultProjectId) => {
    setTaskModal({ defaultProjectId });
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const getActiveProjectId = () => {
    if (view.startsWith("project-")) return view.replace("project-", "");
    return null;
  };

  const renderContent = () => {
    const pid = getActiveProjectId();
    if (pid) return (
      <ProjectDetailView projectId={pid} user={currentUser} tasks={tasks} projects={myProjects} users={users}
        onTaskClick={setTaskDetailModal} onNewTask={() => openNewTask(pid)} />
    );

    switch (view) {
      case "dashboard": return (
        <DashboardView user={currentUser} tasks={tasks} projects={myProjects} users={users}
          onTaskClick={setTaskDetailModal} onNewTask={() => setTaskModal(true)} />
      );
      case "projects": return (
        <ProjectsView user={currentUser} tasks={tasks} projects={myProjects} users={users}
          setView={setView} onNewProject={() => setProjectModal(true)}
          onEditProject={setEditProjectModal} onDeleteProject={handleDeleteProject} />
      );
      case "tasks": return (
        <MyTasksView user={currentUser} tasks={tasks} projects={myProjects} users={users}
          onTaskClick={setTaskDetailModal} onNewTask={() => setTaskModal(true)} />
      );
      case "team": return isAdmin
        ? <TeamView users={users} tasks={tasks} projects={projects} />
        : <div style={{ color: "#ef4444", padding: 40 }}>Access denied.</div>;
      default: return null;
    }
  };

  const defaultProjId = taskModal?.defaultProjectId || getActiveProjectId() || myProjects[0]?.id;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#08080f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#f1f1f5" }}>
      <Sidebar user={currentUser} view={view} setView={setView} projects={myProjects} onLogout={handleLogout} />

      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        {renderContent()}
      </main>

      {/* Task Form Modal */}
      {taskModal && (
        <TaskFormModal
          task={null}
          projects={myProjects}
          users={users}
          currentUser={currentUser}
          onSave={handleSaveTask}
          onClose={() => setTaskModal(null)}
        />
      )}

      {/* Edit Task Modal */}
      {editTaskModal && (
        <TaskFormModal
          task={editTaskModal}
          projects={myProjects}
          users={users}
          currentUser={currentUser}
          onSave={handleSaveTask}
          onClose={() => setEditTaskModal(null)}
        />
      )}

      {/* Project Form Modal */}
      {projectModal && (
        <ProjectFormModal
          project={null}
          users={users}
          currentUser={currentUser}
          onSave={handleSaveProject}
          onClose={() => setProjectModal(null)}
        />
      )}

      {/* Edit Project Modal */}
      {editProjectModal && (
        <ProjectFormModal
          project={editProjectModal}
          users={users}
          currentUser={currentUser}
          onSave={handleSaveProject}
          onClose={() => setEditProjectModal(null)}
        />
      )}

      {/* Task Detail Modal */}
      {taskDetailModal && (
        <TaskDetailModal
          task={taskDetailModal}
          users={users}
          projects={projects}
          currentUser={currentUser}
          onClose={() => setTaskDetailModal(null)}
          onEdit={() => { setEditTaskModal(taskDetailModal); setTaskDetailModal(null); }}
          onDelete={() => handleDeleteTask(taskDetailModal.id)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
