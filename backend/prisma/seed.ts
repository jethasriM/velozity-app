import { PrismaClient, Priority, TaskStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding database...");

  // Wipe in FK-safe order for repeatable seeding.
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { name: "Aisha Khan", email: "admin@velozity.test", passwordHash: defaultPassword, role: "ADMIN" },
  });

  const [pm1, pm2] = await Promise.all([
    prisma.user.create({
      data: { name: "Marcus Reyes", email: "pm1@velozity.test", passwordHash: defaultPassword, role: "PM" },
    }),
    prisma.user.create({
      data: { name: "Priya Nair", email: "pm2@velozity.test", passwordHash: defaultPassword, role: "PM" },
    }),
  ]);

  const [dev1, dev2, dev3, dev4] = await Promise.all([
    prisma.user.create({
      data: { name: "Ravi Shah", email: "dev1@velozity.test", passwordHash: defaultPassword, role: "DEVELOPER" },
    }),
    prisma.user.create({
      data: { name: "Elena Petrova", email: "dev2@velozity.test", passwordHash: defaultPassword, role: "DEVELOPER" },
    }),
    prisma.user.create({
      data: { name: "Tom Baker", email: "dev3@velozity.test", passwordHash: defaultPassword, role: "DEVELOPER" },
    }),
    prisma.user.create({
      data: { name: "Grace Lin", email: "dev4@velozity.test", passwordHash: defaultPassword, role: "DEVELOPER" },
    }),
  ]);

  const [clientA, clientB, clientC] = await Promise.all([
    prisma.client.create({ data: { name: "Northwind Retail" } }),
    prisma.client.create({ data: { name: "BluePeak Logistics" } }),
    prisma.client.create({ data: { name: "Solace Health" } }),
  ]);

  const projectAlpha = await prisma.project.create({
    data: {
      name: "Northwind Storefront Revamp",
      description: "Rebuild the e-commerce storefront with a new checkout flow.",
      clientId: clientA.id,
      pmId: pm1.id,
    },
  });

  const projectBeta = await prisma.project.create({
    data: {
      name: "BluePeak Fleet Tracker",
      description: "Real-time fleet location dashboard for dispatch.",
      clientId: clientB.id,
      pmId: pm1.id,
    },
  });

  const projectGamma = await prisma.project.create({
    data: {
      name: "Solace Patient Portal",
      description: "Self-service portal for appointment scheduling and records.",
      clientId: clientC.id,
      pmId: pm2.id,
    },
  });

  const now = Date.now();
  const daysFromNow = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  type TaskSeed = {
    title: string;
    description: string;
    assignedToId: string;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date;
    isOverdue?: boolean;
  };

  async function seedProjectTasks(projectId: string, tasks: TaskSeed[]) {
    const created = [];
    for (const t of tasks) {
      const task = await prisma.task.create({
        data: {
          projectId,
          title: t.title,
          description: t.description,
          assignedToId: t.assignedToId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          isOverdue: t.isOverdue ?? false,
        },
      });
      created.push(task);

      // Seed a plausible activity trail so the feed isn't empty on first load.
      if (t.status !== "TODO") {
        await prisma.activityLog.create({
          data: {
            taskId: task.id,
            projectId,
            actorId: t.assignedToId,
            fromStatus: "TODO",
            toStatus: t.status === "DONE" ? "IN_PROGRESS" : t.status,
            message: `moved Task #${task.number} from TODO → ${t.status === "DONE" ? "IN_PROGRESS" : t.status}`,
            createdAt: daysFromNow(-3),
          },
        });
      }
      if (t.status === "DONE") {
        await prisma.activityLog.create({
          data: {
            taskId: task.id,
            projectId,
            actorId: t.assignedToId,
            fromStatus: "IN_REVIEW",
            toStatus: "DONE",
            message: `moved Task #${task.number} from IN_REVIEW → DONE`,
            createdAt: daysFromNow(-1),
          },
        });
      }
    }
    return created;
  }

  await seedProjectTasks(projectAlpha.id, [
    { title: "Design new checkout wireframes", description: "Cover mobile + desktop flows.", assignedToId: dev1.id, status: "DONE", priority: "HIGH", dueDate: daysFromNow(-5) },
    { title: "Implement cart persistence", description: "Persist cart across sessions.", assignedToId: dev1.id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: daysFromNow(4) },
    { title: "Integrate Stripe payment intent API", description: "Server-side payment intents.", assignedToId: dev2.id, status: "IN_REVIEW", priority: "CRITICAL", dueDate: daysFromNow(2) },
    { title: "Fix inventory sync race condition", description: "Occasional overselling on flash sales.", assignedToId: dev2.id, status: "TODO", priority: "HIGH", dueDate: daysFromNow(-2), isOverdue: true },
    { title: "Add order confirmation emails", description: "Transactional email templates.", assignedToId: dev1.id, status: "TODO", priority: "LOW", dueDate: daysFromNow(10) },
    { title: "Write checkout E2E tests", description: "Cypress coverage for happy path + failures.", assignedToId: dev2.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(6) },
  ]);

  await seedProjectTasks(projectBeta.id, [
    { title: "Set up WebSocket location stream", description: "Ingest GPS pings from fleet devices.", assignedToId: dev3.id, status: "IN_PROGRESS", priority: "CRITICAL", dueDate: daysFromNow(3) },
    { title: "Build live map dashboard", description: "Leaflet-based map with vehicle markers.", assignedToId: dev3.id, status: "TODO", priority: "HIGH", dueDate: daysFromNow(7) },
    { title: "Geofence alerting rules", description: "Notify dispatch when a truck leaves a zone.", assignedToId: dev4.id, status: "TODO", priority: "MEDIUM", dueDate: daysFromNow(-1), isOverdue: true },
    { title: "Driver mobile check-in flow", description: "Simple check-in/check-out screen.", assignedToId: dev4.id, status: "DONE", priority: "MEDIUM", dueDate: daysFromNow(-8) },
    { title: "Historical route replay", description: "Playback of a route over a selected date range.", assignedToId: dev3.id, status: "IN_REVIEW", priority: "LOW", dueDate: daysFromNow(5) },
  ]);

  await seedProjectTasks(projectGamma.id, [
    { title: "Appointment booking calendar UI", description: "Multi-provider calendar picker.", assignedToId: dev4.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: daysFromNow(6) },
    { title: "HIPAA-compliant audit logging", description: "Track all record access events.", assignedToId: dev4.id, status: "TODO", priority: "CRITICAL", dueDate: daysFromNow(9) },
    { title: "Patient record PDF export", description: "Export visit summary as PDF.", assignedToId: dev1.id, status: "TODO", priority: "LOW", dueDate: daysFromNow(14) },
    { title: "Two-factor auth for patient login", description: "SMS-based 2FA.", assignedToId: dev4.id, status: "IN_REVIEW", priority: "HIGH", dueDate: daysFromNow(1) },
    { title: "Provider availability sync job", description: "Nightly sync from provider EHR system.", assignedToId: dev1.id, status: "DONE", priority: "MEDIUM", dueDate: daysFromNow(-6) },
  ]);

  // A few standing notifications so the bell isn't empty on first login.
  await prisma.notification.createMany({
    data: [
      { userId: dev1.id, type: "TASK_ASSIGNED", message: 'You were assigned to "Add order confirmation emails"', isRead: false },
      { userId: dev2.id, type: "TASK_OVERDUE", message: 'Task "Fix inventory sync race condition" is now overdue', isRead: false },
      { userId: pm1.id, type: "TASK_MOVED_TO_REVIEW", message: 'Task "Integrate Stripe payment intent API" was moved to In Review', isRead: true },
    ],
  });

  console.log("Seed complete.");
  console.log("Login with any of these (password: Password123!):");
  console.log(`  Admin:     ${admin.email}`);
  console.log(`  PM:        ${pm1.email}, ${pm2.email}`);
  console.log(`  Developer: ${dev1.email}, ${dev2.email}, ${dev3.email}, ${dev4.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
