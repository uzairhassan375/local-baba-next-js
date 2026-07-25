import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const DATA_FILE = path.resolve(process.cwd(), "subscriptions.json");

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  currency: string;
  paymentProofUrl: string;
  status: "pending" | "active" | "rejected";
  bankName: string;
  accountTitle: string;
  iban: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

const DEFAULT_BANK_DETAILS = {
  bankName: "Meezan Bank",
  accountTitle: "The Local Baba Trading",
  iban: "PK00MEZN000123456789",
};

function loadSubscriptions(): SubscriptionRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load subscriptions.json", err);
  }
  return [];
}

function saveSubscriptions(records: SubscriptionRecord[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save subscriptions.json", err);
  }
}

// In-memory array synced with file
let subscriptions: SubscriptionRecord[] = loadSubscriptions();

// GET /api/subscriptions — Admin list all subscriptions
router.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    subscriptions,
  });
});

// GET /api/subscriptions/status?email=...
router.get("/status", (req: Request, res: Response) => {
  const email = (req.query.email as string || "").toLowerCase().trim();

  if (!email) {
    return res.json({ isSubscribed: false, status: "none" });
  }

  // Find latest subscription for email
  const userSub = subscriptions.find(s => s.userEmail.toLowerCase() === email && s.status === "active") ||
                  subscriptions.find(s => s.userEmail.toLowerCase() === email && s.status === "pending") ||
                  subscriptions.find(s => s.userEmail.toLowerCase() === email);

  if (!userSub) {
    return res.json({ isSubscribed: false, status: "none" });
  }

  return res.json({
    isSubscribed: userSub.status === "active",
    status: userSub.status,
    subscription: userSub,
  });
});

// POST /api/subscriptions/submit — Member submits payment screenshot
router.post("/submit", (req: Request, res: Response) => {
  const { userEmail, userName, userPhone, paymentProofUrl, amount } = req.body;

  if (!userEmail || !paymentProofUrl) {
    return res.status(400).json({
      success: false,
      error: "User email and payment proof image URL are required.",
    });
  }

  const cleanEmail = userEmail.toLowerCase().trim();
  const existingIdx = subscriptions.findIndex(s => s.userEmail.toLowerCase() === cleanEmail);

  const newSub: SubscriptionRecord = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: cleanEmail,
    userName: userName || cleanEmail.split("@")[0],
    userEmail: cleanEmail,
    userPhone: userPhone || "",
    amount: Number(amount) || 10.00,
    currency: "USD",
    paymentProofUrl,
    status: "pending",
    bankName: DEFAULT_BANK_DETAILS.bankName,
    accountTitle: DEFAULT_BANK_DETAILS.accountTitle,
    iban: DEFAULT_BANK_DETAILS.iban,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    // Update existing subscription submission
    subscriptions[existingIdx] = {
      ...subscriptions[existingIdx],
      ...newSub,
      id: subscriptions[existingIdx].id,
      createdAt: subscriptions[existingIdx].createdAt,
    };
  } else {
    subscriptions.unshift(newSub);
  }

  saveSubscriptions(subscriptions);

  res.json({
    success: true,
    message: "Payment proof submitted successfully! Admin will verify and activate your subscription.",
    subscription: newSub,
  });
});

// POST /api/subscriptions/confirm — Admin confirms payment proof
router.post("/confirm", (req: Request, res: Response) => {
  const { subscriptionId, userEmail } = req.body;

  let targetIndex = -1;
  if (subscriptionId) {
    targetIndex = subscriptions.findIndex(s => s.id === subscriptionId);
  } else if (userEmail) {
    targetIndex = subscriptions.findIndex(s => s.userEmail.toLowerCase() === userEmail.toLowerCase().trim());
  }

  if (targetIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Subscription record not found.",
    });
  }

  subscriptions[targetIndex].status = "active";
  subscriptions[targetIndex].confirmedAt = new Date().toISOString();
  subscriptions[targetIndex].updatedAt = new Date().toISOString();

  saveSubscriptions(subscriptions);

  res.json({
    success: true,
    message: `Payment confirmed for ${subscriptions[targetIndex].userEmail}! Account features unlocked.`,
    subscription: subscriptions[targetIndex],
  });
});

// POST /api/subscriptions/reject — Admin rejects invalid payment proof
router.post("/reject", (req: Request, res: Response) => {
  const { subscriptionId, userEmail } = req.body;

  let targetIndex = -1;
  if (subscriptionId) {
    targetIndex = subscriptions.findIndex(s => s.id === subscriptionId);
  } else if (userEmail) {
    targetIndex = subscriptions.findIndex(s => s.userEmail.toLowerCase() === userEmail.toLowerCase().trim());
  }

  if (targetIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Subscription record not found.",
    });
  }

  subscriptions[targetIndex].status = "rejected";
  subscriptions[targetIndex].updatedAt = new Date().toISOString();

  saveSubscriptions(subscriptions);

  res.json({
    success: true,
    message: `Subscription request rejected for ${subscriptions[targetIndex].userEmail}.`,
    subscription: subscriptions[targetIndex],
  });
});

export default router;
