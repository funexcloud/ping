/** 레거시 `customer-center.html` · `inquiry-board.html` 과 동일 키 */
export const PING_CUSTOMER_INQUIRIES_KEY = "customerInquiries";

export type PingStoredCustomerInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  inquiryType: string;
  title: string;
  content: string;
  password: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
