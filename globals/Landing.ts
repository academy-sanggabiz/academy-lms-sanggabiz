import type { GlobalConfig } from "payload"

export const Landing: GlobalConfig = {
  slug: "landing",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "hero",
      type: "group",
      fields: [
        { name: "heading", type: "text", required: true, defaultValue: "Learn. Grow." },
        { name: "highlightWord", type: "text", required: true, defaultValue: "Succeed." },
        {
          name: "subheading",
          type: "textarea",
          required: true,
          defaultValue:
            "Study at your own pace with lifetime access to course materials and updates.",
        },
        { name: "primaryCtaText", type: "text", required: true, defaultValue: "Get Started" },
        { name: "primaryCtaHref", type: "text", required: true, defaultValue: "/auth/learner/login" },
      ],
    },
    {
      name: "features",
      type: "array",
      minRows: 1,
      fields: [
        {
          name: "icon",
          type: "select",
          required: true,
          defaultValue: "graduation-cap",
          options: [
            { label: "Graduation Cap", value: "graduation-cap" },
            { label: "Layers", value: "layers" },
            { label: "Award", value: "award" },
          ],
        },
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
      ],
    },
  ],
}
