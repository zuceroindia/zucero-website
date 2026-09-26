import { NextResponse } from "next/server";
import { isAuthorizedCmsRequest } from "@/lib/squargraph-control-cms-auth";
import {
  createDiscountCoupon,
  deleteDiscountCoupon,
  getDiscountCoupons,
  setDiscountCouponActive,
} from "@/lib/coupons";

export const dynamic = "force-dynamic";

async function authorized(request: Request) {
  return isAuthorizedCmsRequest(request, "publish");
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const coupons = await getDiscountCoupons();
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load coupons." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const coupon = await createDiscountCoupon({
      code: String(body.code || ""),
      percentage: Number(body.percentage),
    });
    const coupons = await getDiscountCoupons();
    return NextResponse.json({ success: true, coupon, coupons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create coupon." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Missing coupon id." }, { status: 400 });
    }
    await setDiscountCouponActive(String(body.id), Boolean(body.active));
    const coupons = await getDiscountCoupons();
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update coupon." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Missing coupon id." }, { status: 400 });
    }
    await deleteDiscountCoupon(String(body.id));
    const coupons = await getDiscountCoupons();
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete coupon." },
      { status: 400 }
    );
  }
}
