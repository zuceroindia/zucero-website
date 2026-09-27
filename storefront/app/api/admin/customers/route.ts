import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type JsonAddress = {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

type OrderRecord = {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_email: string;
  customer_phone?: string | null;
  total_paise: number;
  status: string;
  payment_status: string;
  created_at: string;
  shipping_address?: JsonAddress | null;
  tracking_awb?: string | null;
  courier_name?: string | null;
  shipment_status?: string | null;
};

type ProfileRecord = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type WalletRecord = {
  id: string;
  email?: string | null;
  user_id?: string | null;
  balance_paise?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type WalletTransactionRecord = {
  id: string;
  wallet_id: string;
  order_id?: string | null;
  type?: string | null;
  amount_paise?: number | null;
  balance_after_paise?: number | null;
  description?: string | null;
  created_at: string;
};

type ReferralRecord = {
  code?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  user_id?: string | null;
  reward_percentage?: number | null;
  discount_percentage?: number | null;
  total_referred_orders?: number | null;
  total_earned_paise?: number | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerProfile = {
  userId: string | null;
  email: string;
  fullName: string;
  phone: string;
  accountType: "registered" | "guest";
  accountCreatedAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  phoneConfirmedAt: string | null;
  profileUpdatedAt: string | null;
  providers: string[];
  ordersCount: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  totalSpentRupees: string;
  walletBalanceRupees: string;
  walletLifetimeCreditsRupees: string;
  walletLifetimeDebitsRupees: string;
  referralCode: string;
  referralActive: boolean;
  referralRewardPercentage: number;
  referralDiscountPercentage: number;
  totalReferredOrders: number;
  totalReferralEarnedRupees: string;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  savedAddresses: JsonAddress[];
  latestShippingAddress: JsonAddress | null;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    totalRupees: string;
    shipmentStatus: string | null;
    trackingAwb: string | null;
    courierName: string | null;
  }>;
  walletTransactions: Array<{
    id: string;
    type: string;
    amountRupees: string;
    balanceAfterRupees: string;
    description: string;
    createdAt: string;
  }>;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeAddresses(value: unknown): JsonAddress[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .slice(0, 10)
    .map((item) => ({
      fullName: safeString(item.fullName),
      phone: normalizePhone(item.phone),
      addressLine1: safeString(item.addressLine1),
      addressLine2: safeString(item.addressLine2),
      city: safeString(item.city),
      state: safeString(item.state),
      postalCode: safeString(item.postalCode),
      country: safeString(item.country) || "India",
      isDefault: item.isDefault === true,
    }))
    .filter((item) => item.addressLine1 || item.city || item.postalCode);
}

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase();

    const [
      usersResult,
      ordersResult,
      profilesResult,
      walletsResult,
      referralsResult,
    ] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db
        .from("orders")
        .select("id, order_number, user_id, customer_email, customer_phone, total_paise, status, payment_status, created_at, shipping_address, tracking_awb, courier_name, shipment_status")
        .order("created_at", { ascending: false }),
      db.from("profiles").select("id, full_name, phone, created_at, updated_at"),
      db.from("wallets").select("id, email, user_id, balance_paise, created_at, updated_at"),
      db
        .from("referral_codes")
        .select("code, owner_email, owner_name, owner_phone, user_id, reward_percentage, discount_percentage, total_referred_orders, total_earned_paise, active, created_at, updated_at"),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (walletsResult.error) throw walletsResult.error;
    if (referralsResult.error) throw referralsResult.error;

    const users = usersResult.data.users || [];
    const orders = (ordersResult.data || []) as unknown as OrderRecord[];
    const profiles = (profilesResult.data || []) as unknown as ProfileRecord[];
    const wallets = (walletsResult.data || []) as unknown as WalletRecord[];
    const referrals = (referralsResult.data || []) as unknown as ReferralRecord[];

    const walletIds = wallets.map((wallet) => wallet.id).filter(Boolean);
    let walletTransactions: WalletTransactionRecord[] = [];
    if (walletIds.length) {
      const walletTxResult = await db
        .from("wallet_transactions")
        .select("id, wallet_id, order_id, type, amount_paise, balance_after_paise, description, created_at")
        .in("wallet_id", walletIds)
        .order("created_at", { ascending: false });
      if (walletTxResult.error) throw walletTxResult.error;
      walletTransactions = (walletTxResult.data || []) as unknown as WalletTransactionRecord[];
    }

    const profileByUserId = new Map(profiles.map((profile) => [String(profile.id), profile]));
    const walletByEmail = new Map(
      wallets
        .filter((wallet) => wallet.email)
        .map((wallet) => [normalizeEmail(wallet.email), wallet])
    );
    const walletTxByWalletId = new Map<string, WalletTransactionRecord[]>();
    for (const tx of walletTransactions || []) {
      const key = String(tx.wallet_id);
      const list = walletTxByWalletId.get(key) || [];
      list.push(tx);
      walletTxByWalletId.set(key, list);
    }
    const referralByEmail = new Map(
      referrals
        .filter((referral) => referral.owner_email)
        .map((referral) => [normalizeEmail(referral.owner_email), referral])
    );

    const ordersByEmail = new Map<string, OrderRecord[]>();
    for (const order of orders) {
      const email = normalizeEmail(order.customer_email);
      if (!email) continue;
      const list = ordersByEmail.get(email) || [];
      list.push(order);
      ordersByEmail.set(email, list);
    }

    const customers = new Map<string, CustomerProfile>();

    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (!email) continue;

      const profile = profileByUserId.get(user.id);
      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      const userOrders = ordersByEmail.get(email) || [];
      const latestOrder = userOrders[0];
      const latestAddress = (latestOrder?.shipping_address || null) as JsonAddress | null;
      const wallet = walletByEmail.get(email);
      const transactions = wallet ? walletTxByWalletId.get(String(wallet.id)) || [] : [];
      const referral = referralByEmail.get(email);

      const paidOrders = userOrders.filter(
        (order) => order.payment_status === "captured" || ["paid", "processing", "shipped", "out_for_delivery", "delivered"].includes(order.status)
      );
      const totalSpentPaise = paidOrders.reduce((sum, order) => sum + Number(order.total_paise || 0), 0);
      const credits = transactions
        .filter((tx) => Number(tx.amount_paise || 0) > 0)
        .reduce((sum, tx) => sum + Number(tx.amount_paise || 0), 0);
      const debits = transactions
        .filter((tx) => Number(tx.amount_paise || 0) < 0)
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount_paise || 0)), 0);

      const metadataAddresses = safeAddresses(metadata.addresses);
      const metadataFullName = safeString(metadata.full_name);
      const metadataPhone = normalizePhone(metadata.phone);

      customers.set(email, {
        userId: user.id,
        email,
        fullName: safeString(profile?.full_name) || metadataFullName || safeString(latestAddress?.fullName) || safeString(referral?.owner_name),
        phone: normalizePhone(profile?.phone) || metadataPhone || normalizePhone(user.phone) || normalizePhone(latestOrder?.customer_phone) || normalizePhone(latestAddress?.phone) || normalizePhone(referral?.owner_phone),
        accountType: "registered",
        accountCreatedAt: user.created_at || profile?.created_at || null,
        lastSignInAt: user.last_sign_in_at || null,
        emailConfirmedAt: user.email_confirmed_at || null,
        phoneConfirmedAt: user.phone_confirmed_at || null,
        profileUpdatedAt: profile?.updated_at || user.updated_at || null,
        providers: Array.isArray(user.app_metadata?.providers)
          ? user.app_metadata.providers.map((provider: unknown) => String(provider))
          : user.app_metadata?.provider
            ? [String(user.app_metadata.provider)]
            : [],
        ordersCount: userOrders.length,
        paidOrdersCount: paidOrders.length,
        cancelledOrdersCount: userOrders.filter((order) => order.status === "cancelled").length,
        totalSpentRupees: (totalSpentPaise / 100).toFixed(2),
        walletBalanceRupees: (Number(wallet?.balance_paise || 0) / 100).toFixed(2),
        walletLifetimeCreditsRupees: (credits / 100).toFixed(2),
        walletLifetimeDebitsRupees: (debits / 100).toFixed(2),
        referralCode: safeString(referral?.code) || "-",
        referralActive: referral?.active !== false && Boolean(referral),
        referralRewardPercentage: Number(referral?.reward_percentage || 0),
        referralDiscountPercentage: Number(referral?.discount_percentage || 0),
        totalReferredOrders: Number(referral?.total_referred_orders || 0),
        totalReferralEarnedRupees: (Number(referral?.total_earned_paise || 0) / 100).toFixed(2),
        firstOrderDate: userOrders.length ? userOrders[userOrders.length - 1].created_at : null,
        lastOrderDate: latestOrder?.created_at || null,
        savedAddresses: metadataAddresses,
        latestShippingAddress: latestAddress,
        recentOrders: userOrders.slice(0, 10).map((order) => ({
          id: order.id,
          orderNumber: order.order_number,
          createdAt: order.created_at,
          status: order.status,
          paymentStatus: order.payment_status,
          totalRupees: (Number(order.total_paise || 0) / 100).toFixed(2),
          shipmentStatus: order.shipment_status || null,
          trackingAwb: order.tracking_awb || null,
          courierName: order.courier_name || null,
        })),
        walletTransactions: transactions.slice(0, 20).map((tx) => ({
          id: tx.id,
          type: safeString(tx.type),
          amountRupees: (Number(tx.amount_paise || 0) / 100).toFixed(2),
          balanceAfterRupees: (Number(tx.balance_after_paise || 0) / 100).toFixed(2),
          description: safeString(tx.description),
          createdAt: tx.created_at,
        })),
      });
    }

    for (const [email, userOrders] of ordersByEmail.entries()) {
      if (customers.has(email)) continue;
      const latestOrder = userOrders[0];
      const latestAddress = (latestOrder?.shipping_address || null) as JsonAddress | null;
      const wallet = walletByEmail.get(email);
      const transactions = wallet ? walletTxByWalletId.get(String(wallet.id)) || [] : [];
      const referral = referralByEmail.get(email);
      const paidOrders = userOrders.filter(
        (order) => order.payment_status === "captured" || ["paid", "processing", "shipped", "out_for_delivery", "delivered"].includes(order.status)
      );
      const totalSpentPaise = paidOrders.reduce((sum, order) => sum + Number(order.total_paise || 0), 0);
      const credits = transactions
        .filter((tx) => Number(tx.amount_paise || 0) > 0)
        .reduce((sum, tx) => sum + Number(tx.amount_paise || 0), 0);
      const debits = transactions
        .filter((tx) => Number(tx.amount_paise || 0) < 0)
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount_paise || 0)), 0);

      customers.set(email, {
        userId: null,
        email,
        fullName: safeString(latestAddress?.fullName) || safeString(referral?.owner_name),
        phone: normalizePhone(latestOrder?.customer_phone) || normalizePhone(latestAddress?.phone) || normalizePhone(referral?.owner_phone),
        accountType: "guest",
        accountCreatedAt: null,
        lastSignInAt: null,
        emailConfirmedAt: null,
        phoneConfirmedAt: null,
        profileUpdatedAt: null,
        providers: [],
        ordersCount: userOrders.length,
        paidOrdersCount: paidOrders.length,
        cancelledOrdersCount: userOrders.filter((order) => order.status === "cancelled").length,
        totalSpentRupees: (totalSpentPaise / 100).toFixed(2),
        walletBalanceRupees: (Number(wallet?.balance_paise || 0) / 100).toFixed(2),
        walletLifetimeCreditsRupees: (credits / 100).toFixed(2),
        walletLifetimeDebitsRupees: (debits / 100).toFixed(2),
        referralCode: safeString(referral?.code) || "-",
        referralActive: referral?.active !== false && Boolean(referral),
        referralRewardPercentage: Number(referral?.reward_percentage || 0),
        referralDiscountPercentage: Number(referral?.discount_percentage || 0),
        totalReferredOrders: Number(referral?.total_referred_orders || 0),
        totalReferralEarnedRupees: (Number(referral?.total_earned_paise || 0) / 100).toFixed(2),
        firstOrderDate: userOrders[userOrders.length - 1]?.created_at || null,
        lastOrderDate: latestOrder?.created_at || null,
        savedAddresses: [],
        latestShippingAddress: latestAddress,
        recentOrders: userOrders.slice(0, 10).map((order) => ({
          id: order.id,
          orderNumber: order.order_number,
          createdAt: order.created_at,
          status: order.status,
          paymentStatus: order.payment_status,
          totalRupees: (Number(order.total_paise || 0) / 100).toFixed(2),
          shipmentStatus: order.shipment_status || null,
          trackingAwb: order.tracking_awb || null,
          courierName: order.courier_name || null,
        })),
        walletTransactions: transactions.slice(0, 20).map((tx) => ({
          id: tx.id,
          type: safeString(tx.type),
          amountRupees: (Number(tx.amount_paise || 0) / 100).toFixed(2),
          balanceAfterRupees: (Number(tx.balance_after_paise || 0) / 100).toFixed(2),
          description: safeString(tx.description),
          createdAt: tx.created_at,
        })),
      });
    }

    let customerList = Array.from(customers.values()).sort((a, b) => {
      const aTime = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : new Date(a.accountCreatedAt || 0).getTime();
      const bTime = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : new Date(b.accountCreatedAt || 0).getTime();
      return bTime - aTime;
    });

    if (search) {
      customerList = customerList.filter((customer) => {
        const addressText = [
          ...(customer.savedAddresses || []),
          customer.latestShippingAddress,
        ]
          .filter(Boolean)
          .map((address) => [
            address?.addressLine1,
            address?.addressLine2,
            address?.city,
            address?.state,
            address?.postalCode,
          ].filter(Boolean).join(" "))
          .join(" ")
          .toLowerCase();

        return (
          customer.email.includes(search) ||
          customer.fullName.toLowerCase().includes(search) ||
          customer.phone.includes(search) ||
          customer.referralCode.toLowerCase().includes(search) ||
          addressText.includes(search)
        );
      });
    }

    return NextResponse.json({
      customers: customerList,
      totalCount: customerList.length,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Admin customers fetch failed:", error);
    return NextResponse.json({ error: "Could not load customers." }, { status: 500 });
  }
}
