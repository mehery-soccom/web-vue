import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";

export const usePushNotification = () => {
  const route = useRoute();
  const router = useRouter();

  const pushNotificationStore = usePushNotificationStore();

  const DEFAULT_IMAGE_URL = ``;
  const DEFAULT_LOGO_URL = `https://cdn.jsdelivr.net/gh/mehery-soccom/mehery-content@main/static/app/logo/bg-x-icon.png`;
  const FONT_SIZES = [
    { title: "10px", value: 10 },
    { title: "12px", value: 12 },
    { title: "14px", value: 14 },
    { title: "16px", value: 16 },
    { title: "18px", value: 18 },
    { title: "20px", value: 20 },
    { title: "24px", value: 24 },
    { title: "28px", value: 28 },
  ];
  const WIDTH_SIZES = [
    { title: "100 %", value: 100 },
    { title: "95 %", value: 95 },
    { title: "90 %", value: 90 },
    { title: "85 %", value: 85 },
    { title: "80 %", value: 80 },
    { title: "75 %", value: 75 },
  ];
  const GRADIENT_DIRS = ["to right", "to bottom", "to top", "to left"];
  const GRADIENT_DIRS_2 = [
    { title: "to right", value: "to right" },
    { title: "to bottom", value: "to bottom" },
    { title: "to top", value: "to top" },
    { title: "to left", value: "to left" },
  ];
  const TEMPLATE_ALIGN = [
    { title: "left to right", value: "left" },
    { title: "right to left", value: "right" },
  ];
  const TEMPLATE_ALIGN_2 = [
    { title: "left to right", value: "left" },
    { title: "right to left", value: "right" },
  ];
  const TEMPLATES_CONFIG = {
    simple: {
      default: {
        logo_url: DEFAULT_LOGO_URL,
        image_url: "",
      },
    },
    styled: {
      delivery: {
        logo_url: DEFAULT_LOGO_URL,
        image_url:
          "https://play-lh.googleusercontent.com/s0JLCfh27w6kxCd81YnGGZeGIc8KdKx_7d2QEZSlMdXPBYFsN8mAUzW9p1s47QCVGb4",
      },
    },
  };
  const BUTTON_GROUPS = [
    {
      label: "Yes | No",
      value: "CONFIRMATION_CATEGORY",
      children: [
        {
          id: "PUSHAPP_YES",
          text: "Yes",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          id: "PUSHAPP_NO",
          text: "No",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        // { text: "Yes", id: "PUSHAPP_YES" },
        // { text: "No", id: "PUSHAPP_NO" },
      ],
    },
    {
      label: "Accept | Reject",
      value: "RESPONSE_CATEGORY",
      children: [
        {
          text: "Accept",
          id: "PUSHAPP_ACCEPT",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Reject",
          id: "PUSHAPP_REJECT",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Subscribe | Unsubscribe",
      value: "SUBSCRIPTION_CATEGORY",
      children: [
        {
          text: "Subscribe",
          id: "PUSHAPP_SUB",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Unsubscribe",
          id: "PUSHAPP_UNSUB",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Buy | Sell",
      value: "TRANSACTION_CATEGORY",
      children: [
        {
          text: "Buy",
          id: "PUSHAPP_BUY",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Sell",
          id: "PUSHAPP_SELL",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "View | Add",
      value: "CONTENT_CATEGORY",
      children: [
        {
          text: "View",
          id: "PUSHAPP_VIEW",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Add",
          id: "PUSHAPP_ADD",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Cart | Pay",
      value: "CHECKOUT_CATEGORY",
      children: [
        {
          text: "Cart",
          id: "PUSHAPP_CART",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Pay",
          id: "PUSHAPP_PAY",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Save | Submit",
      value: "FORM_ACTION_CATEGORY",
      children: [
        {
          text: "Save",
          id: "PUSHAPP_SAVE",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Submit",
          id: "PUSHAPP_SUBMIT",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Cancel | Delete",
      value: "DESTRUCTIVE_ACTION_CATEGORY",
      children: [
        {
          text: "Cancel",
          id: "PUSHAPP_CANCEL",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Delete",
          id: "PUSHAPP_DELETE",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
    {
      label: "Call | Email",
      value: "CONTACT_CATEGORY",
      children: [
        {
          text: "Call",
          id: "PUSHAPP_CALL",
          name: "",
          path: "style.button1_url",
          type: "text",
          label: "Button URL -> 1",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
        {
          text: "Email",
          id: "PUSHAPP_EMAIL",
          name: "",
          path: "style.button2_url",
          type: "text",
          label: "Button URL -> 2",
          placeholder: "Enter URL",
          required: true,
          readonly: false,
          defaultValue: null,
        },
      ],
    },
  ];

  return {
    DEFAULT_IMAGE_URL,
    DEFAULT_LOGO_URL,
    FONT_SIZES,
    WIDTH_SIZES,
    GRADIENT_DIRS,
    GRADIENT_DIRS_2,
    TEMPLATE_ALIGN,
    TEMPLATE_ALIGN_2,
    TEMPLATES_CONFIG,
    BUTTON_GROUPS,
  };
};
