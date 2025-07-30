// MySelectExtended
// path: style.category and emit changes to it,
// children path:  { style.button1_url: '', style.button2_url: '', }


// key should be changed to path

// handling columns in case of custom types
import { usePushNotification } from '@/app-pushapp/views/admin/push-notification/usePushNotification';
import { useAppEngagementsStore } from '@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore';

export function getSubTypes() {
  const { FONT_SIZES, WIDTH_SIZES, GRADIENT_DIRS, TEMPLATE_ALIGN, TEMPLATE_ALIGN_2, TEMPLATES_CONFIG } = usePushNotification();
  const AppEngagementsStore = useAppEngagementsStore();
  return [
    {
      label: "Simple",
      value: "simple",
      desc: "",
      type: "simple",
      form: {
        fields: [
          { id: "sim-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "", required: true, readonly: false, defaultValue: null },
          { id: "sim-message", name: "", path: "style.message", type: "textarea", label: "Message", placeholder: "", required: true, readonly: false, defaultValue: null},
          // { id: "sim-category", name: "", path: "style.category", type: "select", label: "CTA Group", optionsPath: "buttonGroupList", placeholder: "", required: false, readonly: false, defaultValue: null },
          { id: "sim-cta-button", name: "", path: "style.category", type: "extendedSelect", label: "CTA Group", optionsPath: AppEngagementsStore.buttonGroupList, placeholder: "", required: false, readonly: false, defaultValue: null, 
            // children : [
            //   { id: "sim-button1", name: "", path: "style.button1_url", type: "text", label: "Button URL -> 1", placeholder: "Enter URL", required: true, readonly: false, defaultValue: null },
            //   { id: "sim-button2", name: "", path: "style.button2_url", type: "text", label: "Button URL -> 2", placeholder: "Enter URL", required: true, readonly: false, defaultValue: null },
            // ] 
          },
          { id: "sim-image", name: "", path: "style.image_url", type: "file", label: "Upload Image", placeholder: "", required: false, readonly: false, defaultValue: null },
          // { id: "sim-btn", name: "", path: "style.btn", type: "addButton", label: "Title",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
          // style.btn will be array at time of submission.
          // at time of edit, render the array 
          // {
          //    label: "", value: "", desc: ""
          // }

        ]
      }
    },
    {
      label: "Delivery",
      value: "delivery",
      desc: "",
      type: "styled",
      form: {
        fields: [
            { id: "del-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
            { id: "del-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
            { id: "del-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3,  textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
            { id: "del-logo1", name: "", path: "style.logo_url", type: "file", label: "Upload Logo", placeholder: "Enter logo", required: false, readonly: false, defaultValue: null },
            { id: "del-image1", name: "", path: "style.image_url", type: "file", label: "Upload Image", placeholder: "Enter image", required: false, readonly: false, defaultValue: null },
            { id: "del-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:3, required: false, readonly: false, defaultValue: null },
            { id: "del-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Gradient Color", placeholder: "Enter color",cols:3, required: false, readonly: false, defaultValue: null },
            { id: "del-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:3, required: false, readonly: false, defaultValue: null },
            { id: "del-pro-color", name: "", path: "style.progress_color", type: "color", label: "Progress Color", placeholder: "Enter progress color",cols:3, required: false, readonly: false, defaultValue: null },
            { id: "del-align", name: "", path: "style.align", type: "select", label: "Color gradient direction",optionsPath: TEMPLATE_ALIGN_2, placeholder: "", required: false, readonly: false, defaultValue: null }
        ]
      }
    },
    {
      label: "Roadblock",
      value: "roadblock",
      desc: "",
      type: "pop-up",
      form: {
        fields: [
          { id: "road-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "Enter title", required: true, readonly: false, defaultValue: null },
          { id: "road-width", name: "", path: "style.width", type: "select", label: "Select width", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-height", name: "", path: "style.height", type: "select", label: "Select height", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Color gradient", placeholder: "Enter color",cols:4,required: false, readonly: false, defaultValue: null },
          { id: "road-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
          { id: "road-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
          { id: "road-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3, textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
          { id: "road-btn", name: "", path: "style.btn", type: "addButton", label: "Buttons",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
        ]
      },
      preview: {
        dummy: {},
        live: {},
      },
    },
    {
      label: "Roadblock with Image",
      value: "roadblock-image",
      desc: "",
      type: "pop-up",
      form: {
        fields: [
          { id: "road-img-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "Enter title", required: true, readonly: false, defaultValue: null },
          { id: "road-img-width", name: "", path: "style.width", type: "select", label: "Select width", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-img-height", name: "", path: "style.height", type: "select", label: "Select height", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-img-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-img-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Color gradient", placeholder: "Enter color",cols:4,required: false, readonly: false, defaultValue: null },
          { id: "road-img-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-img-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
          { id: "road-img-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
          { id: "road-img-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3, textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
          { id: "road-btn", name: "", path: "style.btn", type: "addButton", label: "Buttons",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
          { id: "road-img-image", name: "", path: "style.image_url", type: "file", label: "Image" }
        ]
      }
    },
    {
      label: "Roadblock with Video",
      value: "roadblock-video",
      desc: "",
      type: "pop-up",
      form: {
        fields: [
          { id: "road-vid-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "Enter title", required: true, readonly: false, defaultValue: null },
          { id: "road-vid-width", name: "", path: "style.width", type: "select", label: "Select width", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-vid-height", name: "", path: "style.height", type: "select", label: "Select height", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-vid-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-vid-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Color gradient", placeholder: "Enter color",cols:4,required: false, readonly: false, defaultValue: null },
          { id: "road-vid-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-vid-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
          { id: "road-vid-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
          { id: "road-vid-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3, textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
          { id: "road-btn", name: "", path: "style.btn", type: "addButton", label: "Buttons",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
          { id: "road-vid-video", name: "", path: "style.video_url", type: "file", label: "Video" }
        ]
      }
    },
    {
      label: "Roadblock with Image Carousel",
      value: "roadblock-image-carousel",
      desc: "",
      type: "pop-up",
      form: {
        fields: [
          { id: "road-car-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "Enter title", required: true, readonly: false, defaultValue: null },
          { id: "road-car-width", name: "", path: "style.width", type: "select", label: "Select width", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-car-height", name: "", path: "style.height", type: "select", label: "Select height", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Color gradient", placeholder: "Enter color",cols:4,required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-car-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
          { id: "road-car-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
          { id: "road-car-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3, textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
          { id: "road-car-btn", name: "", path: "style.btn", type: "addButton", label: "Buttons",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
          { id: "road-car-image", name: "", path: "style.image_urls", type: "addFiles", label: "Image", max: 3, placeholder: "", required: true, readonly: false, defaultValue: null }
        ]
        // image_urls will be array of objects
      }
    },
    {
      label: "Roadblock with Video Carousel",
      value: "roadblock-video-carousel",
      desc: "",
      type: "pop-up",
      form: {
        fields: [
          { id: "road-car-title", name: "", path: "style.title", type: "text", label: "Title", placeholder: "Enter title", required: true, readonly: false, defaultValue: null },
          { id: "road-car-width", name: "", path: "style.width", type: "select", label: "Select width", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-car-height", name: "", path: "style.height", type: "select", label: "Select height", optionsPath: WIDTH_SIZES, placeholder: "", cols:6, required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-color", name: "", path: "style.bg_color", type: "color", label: "Background Color", placeholder: "Enter color",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-gradient", name: "", path: "style.bg_color_gradient", type: "color", label: "Color gradient", placeholder: "Enter color",cols:4,required: false, readonly: false, defaultValue: null },
          { id: "road-car-bg-gradient-dir", name: "", path: "style.bg_color_gradient_dir", type: "select", label: "Color gradient direction",optionsPath: GRADIENT_DIRS, placeholder: "",cols:4, required: false, readonly: false, defaultValue: null },
          { id: "road-car-line1", name: "", path: "style.line_1",type: "textinputstyle",label: "Line 1 Text",placeholder: "Enter text for line 1",line:1, textinputstylesKey: "data",fontSizeKey: "style.line1_font_size",fontColorKey: "style.line1_font_color",textStylesKey: "style.line1_text_styles"},
          { id: "road-car-line2", name: "", path: "style.line_2",type: "textinputstyle",label: "Line 2 Text",placeholder: "Enter text for line 2",line:2, textinputstylesKey: "data",fontSizeKey: "style.line2_font_size",fontColorKey: "style.line2_font_color",textStylesKey: "style.line2_text_styles"},
          { id: "road-car-line3", name: "", path: "style.line_3",type: "textinputstyle",label: "Line 3 Text",placeholder: "Enter text for line 3",line:3, textinputstylesKey: "data",fontSizeKey: "style.line3_font_size",fontColorKey: "style.line3_font_color",textStylesKey: "style.line3_text_styles"},
          { id: "road-car-btn", name: "", path: "style.btn", type: "addButton", label: "Buttons",max: 2, placeholder: "", required: true, readonly: false, defaultValue: null },
          { id: "road-car-video", name: "", path: "style.video_urls", type: "addFiles", label: "Image", max: 3, placeholder: "", required: true, readonly: false, defaultValue: null }
        ]
        // image_urls will be array of objects
      }
    },
  ];
}
