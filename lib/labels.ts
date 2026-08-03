export const TRIP_LABEL: Record<string, string> = {
  plan: "ตามแผน",
  off_plan: "นอกแผน",
};

export const MISSION_LABEL: Record<string, string> = {
  tak: "เยี่ยมเยียน",
  dem: "เดม",
  tel: "โทร / LINE",
};

export const RESULT_LABEL: Record<string, string> = {
  buy: "ซื้อ",
  no_buy: "ไม่ซื้อ",
  not_found: "ไม่พบ",
};

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  new: "ลูกค้าใหม่",
  existing: "ลูกค้าเก่า",
};

export const MISSION_OPTIONS = [
  { value: "tak", label: MISSION_LABEL.tak },
  { value: "dem", label: MISSION_LABEL.dem },
  { value: "tel", label: MISSION_LABEL.tel },
];

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "new", label: CUSTOMER_TYPE_LABEL.new },
  { value: "existing", label: CUSTOMER_TYPE_LABEL.existing },
];
