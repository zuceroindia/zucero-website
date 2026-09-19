import { supabaseAdmin } from "@/lib/supabase-admin";

export type ReferralValidationResult = {
  valid: boolean;
  code?: string;
  discountPercentage?: number;
  discountBps?: number;
  ownerName?: string;
  error?: string;
};

export type WalletInfo = {
  balancePaise: number;
  balanceRupees: number;
  earnedReferralPaise: number;
  earnedReferralRupees: number;
  manualTopupPaise: number;
  manualTopupRupees: number;
  spentOrdersPaise: number;
  spentOrdersRupees: number;
  walletId?: string;
  transactions?: Array<{
    id: string;
    type: string;
    amountPaise: number;
    amountRupees: number;
    description: string;
    createdAt: string;
  }>;
};

function sanitizeNameForCode(name: string): string {
  const first = name.trim().split(/\s+/)[0] || "SUGAR";
  return first.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
}

function randomSuffix(length = 3): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Retrieves or auto-creates a clean, memorable referral code for a customer.
 * e.g. "REF-TAMANNA" or "REF-SUGAR7X"
 */
export async function getOrCreateReferralCode(input: {
  email: string;
  name?: string;
  phone?: string;
  userId?: string | null;
}) {
  const db = supabaseAdmin();
  const normalizedEmail = input.email.trim().toLowerCase();

  // 1. Check if customer already has a code
  const { data: existing } = await db
    .from("referral_codes")
    .select("*")
    .ilike("owner_email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // 2. Ensure customer has a wallet
  await getOrCreateWallet(normalizedEmail, input.userId);

  // 3. Generate candidate code with REF- prefix
  const baseName = sanitizeNameForCode(input.name || "ZUC");
  let candidate = `REF-${baseName}`;

  // Verify uniqueness
  const { data: collision } = await db
    .from("referral_codes")
    .select("id")
    .eq("code", candidate)
    .maybeSingle();

  if (collision) {
    candidate = `REF-${baseName}${randomSuffix(2)}`;
  }

  // Double check collision
  const { data: collision2 } = await db
    .from("referral_codes")
    .select("id")
    .eq("code", candidate)
    .maybeSingle();

  if (collision2) {
    candidate = `REF-${randomSuffix(5)}`;
  }

  // 4. Insert new referral code
  const { data: created, error } = await db
    .from("referral_codes")
    .insert({
      code: candidate,
      owner_email: normalizedEmail,
      owner_name: input.name || null,
      owner_phone: input.phone || null,
      user_id: input.userId || null,
      reward_percentage: 10,
      discount_percentage: 10,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Could not create referral code:", error);
    // Fallback query in case of race condition
    const { data: fallback } = await db
      .from("referral_codes")
      .select("*")
      .ilike("owner_email", normalizedEmail)
      .maybeSingle();
    return fallback;
  }

  return created;
}

/**
 * Validates a referral code entered at checkout.
 * Enforces:
 * 1. Code exists & is active
 * 2. Buyer cannot use their own referral code
 */
export async function validateReferralCode(
  code: string,
  buyerEmail?: string
): Promise<ReferralValidationResult> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: "Please enter a referral code." };
  }

  const db = supabaseAdmin();
  const { data: ref, error } = await db
    .from("referral_codes")
    .select("*")
    .eq("code", cleanCode)
    .maybeSingle();

  if (error || !ref) {
    return { valid: false, error: "Referral code not found." };
  }

  if (!ref.active) {
    return { valid: false, error: "This referral code is no longer active." };
  }

  if (buyerEmail && ref.owner_email.toLowerCase() === buyerEmail.trim().toLowerCase()) {
    return {
      valid: false,
      error: "You cannot use your own referral code.",
    };
  }

  return {
    valid: true,
    code: ref.code,
    discountPercentage: ref.discount_percentage ?? 10,
    discountBps: (ref.discount_percentage ?? 10) * 100,
    ownerName: ref.owner_name || "A Zucero Friend",
  };
}

/**
 * Retrieves or creates a customer's wallet.
 */
export async function getOrCreateWallet(email: string, userId?: string | null) {
  const db = supabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await db
    .from("wallets")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await db
    .from("wallets")
    .insert({
      email: normalizedEmail,
      user_id: userId || null,
      balance_paise: 0,
    })
    .select("*")
    .single();

  if (error) {
    // If concurrent insert created it
    const { data: fallback } = await db
      .from("wallets")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    return fallback;
  }

  return created;
}

/**
 * Returns wallet balance, stream breakdown (referral vs topup), and recent transactions.
 */
export async function getWalletInfo(email: string): Promise<WalletInfo> {
  const db = supabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const wallet = await getOrCreateWallet(normalizedEmail);
  if (!wallet) {
    return {
      balancePaise: 0,
      balanceRupees: 0,
      earnedReferralPaise: 0,
      earnedReferralRupees: 0,
      manualTopupPaise: 0,
      manualTopupRupees: 0,
      spentOrdersPaise: 0,
      spentOrdersRupees: 0,
    };
  }

  const { data: allTransactions } = await db
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false });

  let earnedReferralPaise = 0;
  let manualTopupPaise = 0;
  let spentOrdersPaise = 0;

  for (const t of allTransactions || []) {
    if (t.type === "credit_referral") {
      earnedReferralPaise += t.amount_paise || 0;
    } else if (t.type === "wallet_topup" || t.type === "admin_credit") {
      manualTopupPaise += t.amount_paise || 0;
    } else if (t.type === "debit_order" || t.type === "subscription_debit" || t.type === "admin_debit") {
      spentOrdersPaise += Math.abs(t.amount_paise || 0);
    }
  }

  return {
    walletId: wallet.id,
    balancePaise: wallet.balance_paise || 0,
    balanceRupees: Number(((wallet.balance_paise || 0) / 100).toFixed(2)),
    earnedReferralPaise,
    earnedReferralRupees: Number((earnedReferralPaise / 100).toFixed(2)),
    manualTopupPaise,
    manualTopupRupees: Number((manualTopupPaise / 100).toFixed(2)),
    spentOrdersPaise,
    spentOrdersRupees: Number((spentOrdersPaise / 100).toFixed(2)),
    transactions: (allTransactions || []).slice(0, 20).map((t: any) => ({
      id: t.id,
      type: t.type,
      amountPaise: t.amount_paise,
      amountRupees: Number((t.amount_paise / 100).toFixed(2)),
      description: t.description,
      createdAt: t.created_at,
    })),
  };
}

/**
 * Credits 10% of a completed paid order to the referrer's wallet.
 */
export async function creditReferralReward(orderId: string) {
  const db = supabaseAdmin();

  // 1. Fetch order
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("[Referral] Order not found for reward credit:", orderId);
    return false;
  }

  // 2. Check if referral code was used and hasn't been rewarded yet
  if (!order.referral_code_used || order.referral_reward_credited) {
    return false;
  }

  // 3. Find referral code owner
  const { data: refCode } = await db
    .from("referral_codes")
    .select("*")
    .eq("code", order.referral_code_used.trim().toUpperCase())
    .maybeSingle();

  if (!refCode) {
    console.warn(`[Referral] Referral code ${order.referral_code_used} not found in database.`);
    return false;
  }

  // Calculate 10% of subtotal (or total paid)
  const rewardRate = refCode.reward_percentage || 10;
  const rewardPaise = Math.round((order.subtotal_paise * rewardRate) / 100);
  if (rewardPaise <= 0) return false;

  // 4. Ensure referrer's wallet exists
  const referrerWallet = await getOrCreateWallet(refCode.owner_email, refCode.user_id);
  if (!referrerWallet) {
    console.error("[Referral] Failed to retrieve referrer wallet for", refCode.owner_email);
    return false;
  }

  const newBalancePaise = (referrerWallet.balance_paise || 0) + rewardPaise;

  // 5. Update wallet balance
  await db
    .from("wallets")
    .update({
      balance_paise: newBalancePaise,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referrerWallet.id);

  // 6. Record transaction
  const rewardRupees = (rewardPaise / 100).toFixed(2);
  await db.from("wallet_transactions").insert({
    wallet_id: referrerWallet.id,
    order_id: order.id,
    type: "credit_referral",
    amount_paise: rewardPaise,
    balance_after_paise: newBalancePaise,
    description: `10% Referral cashback from friend's order ${order.order_number}`,
  });

  // 7. Update referral code stats
  await db
    .from("referral_codes")
    .update({
      total_referred_orders: (refCode.total_referred_orders || 0) + 1,
      total_earned_paise: (refCode.total_earned_paise || 0) + rewardPaise,
      updated_at: new Date().toISOString(),
    })
    .eq("id", refCode.id);

  // 8. Mark order as rewarded
  await db
    .from("orders")
    .update({
      referral_reward_credited: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  console.info(`[Referral] Successfully credited ₹${rewardRupees} to ${refCode.owner_email} for order ${order.order_number}`);
  return true;
}

/**
 * Debits a customer's wallet when they use credits on an order.
 */
export async function debitWallet(input: {
  email: string;
  orderId: string;
  orderNumber: string;
  debitPaise: number;
}) {
  if (input.debitPaise <= 0) return true;

  const db = supabaseAdmin();
  const normalizedEmail = input.email.trim().toLowerCase();
  const wallet = await getOrCreateWallet(normalizedEmail);
  if (!wallet) throw new Error("Customer wallet not found for debit");

  const currentBalance = wallet.balance_paise || 0;
  if (currentBalance < input.debitPaise) {
    throw new Error(`Insufficient wallet balance. Available: ₹${(currentBalance / 100).toFixed(2)}`);
  }

  const newBalance = currentBalance - input.debitPaise;

  await db
    .from("wallets")
    .update({
      balance_paise: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  await db.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    order_id: input.orderId,
    type: "debit_order",
    amount_paise: -input.debitPaise,
    balance_after_paise: newBalance,
    description: `Applied on order ${input.orderNumber}`,
  });

  return true;
}

/**
 * Refunds spent wallet credits back to a customer if an order is refunded or cancelled.
 */
export async function refundWalletCredits(input: {
  email: string;
  orderId: string;
  orderNumber: string;
  refundPaise: number;
}) {
  if (input.refundPaise <= 0) return true;

  const db = supabaseAdmin();
  const normalizedEmail = input.email.trim().toLowerCase();
  const wallet = await getOrCreateWallet(normalizedEmail);
  if (!wallet) return false;

  // Prevent duplicate refunds
  const { data: existingRefund } = await db
    .from("wallet_transactions")
    .select("id")
    .eq("wallet_id", wallet.id)
    .eq("order_id", input.orderId)
    .eq("type", "refund")
    .maybeSingle();

  if (existingRefund) {
    return true;
  }

  const newBalance = (wallet.balance_paise || 0) + input.refundPaise;

  await db
    .from("wallets")
    .update({
      balance_paise: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  await db.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    order_id: input.orderId,
    type: "refund",
    amount_paise: input.refundPaise,
    balance_after_paise: newBalance,
    description: `Refunded wallet credits for order ${input.orderNumber}`,
  });

  return true;
}

/**
 * Credits wallet after a successful Razorpay top-up transaction.
 */
export async function creditWalletTopup(input: {
  email: string;
  amountPaise: number;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
}) {
  if (input.amountPaise <= 0) throw new Error("Invalid top-up amount");

  const db = supabaseAdmin();
  const normalizedEmail = input.email.trim().toLowerCase();
  const wallet = await getOrCreateWallet(normalizedEmail);
  if (!wallet) throw new Error("Could not access or create customer wallet");

  // Prevent duplicate credit for the same payment ID
  const desc = `Wallet Top-Up (${input.razorpayPaymentId})`;
  const { data: existing } = await db
    .from("wallet_transactions")
    .select("id")
    .eq("wallet_id", wallet.id)
    .eq("description", desc)
    .maybeSingle();

  if (existing) {
    return { balancePaise: wallet.balance_paise, walletId: wallet.id };
  }

  const newBalance = (wallet.balance_paise || 0) + input.amountPaise;

  await db
    .from("wallets")
    .update({
      balance_paise: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  await db.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    type: "wallet_topup",
    amount_paise: input.amountPaise,
    balance_after_paise: newBalance,
    description: desc,
  });

  return { balancePaise: newBalance, walletId: wallet.id };
}


