export type CustomerDetails = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type PurchaseLine = {
  productName: string;
  variantLabel: string;
  quantity: number;
};

export const emptyCustomerDetails: CustomerDetails = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export function customerAddress(details: CustomerDetails) {
  return [details.addressLine1, details.addressLine2, details.city, details.state, details.postalCode, details.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}
