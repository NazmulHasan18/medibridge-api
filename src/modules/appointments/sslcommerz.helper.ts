import { createRequire } from "node:module";
import { config } from "../../config/index.js";

const require = createRequire(import.meta.url);

const SSLCommerzPayment = require("sslcommerz-lts") as new (
  storeId: string,
  storePassword: string,
  isLive?: boolean,
) => {
  init: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  validate: (data: { val_id: string }) => Promise<Record<string, unknown>>;
};

const sslcommerz = new SSLCommerzPayment(
  config.sslcommerz.storeId,
  config.sslcommerz.storePassword,
  !config.sslcommerz.isSandbox,
);

export interface SSLCommerzPaymentInitPayload {
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  cus_add1?: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  shipping_method?: string;
  num_of_item?: number;
  [key: string]: unknown;
}

export interface SSLCommerzInitResponse {
  status: string;
  GatewayPageURL: string;
  sessionkey: string;
  [key: string]: unknown;
}

export const initiateSSLCommerzPayment = async (
  payload: SSLCommerzPaymentInitPayload,
): Promise<SSLCommerzInitResponse> => {
  const response = await sslcommerz.init(payload as Record<string, unknown>);

  if (response.status !== "SUCCESS") {
    throw new Error((response.failedreason as string) || "SSLCommerz payment initiation failed");
  }

  return response as SSLCommerzInitResponse;
};

export const validateSSLCommerzPayment = async (val_id: string): Promise<Record<string, unknown>> => {
  return sslcommerz.validate({ val_id });
};

export const generateTransactionId = (appointmentPublicId: string): string => {
  const timestamp = Date.now();
  return `TXN-${appointmentPublicId}-${timestamp}`;
};
