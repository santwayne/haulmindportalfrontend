import{j as e}from"./index-CnrUjWUV.js";import"./vendor-antd-AQGMDB11.js";import{X as g,ag as t,g as f,aq as h,p as b}from"./vendor-icons-CyiE_MWF.js";const y=({isOpen:n,onClose:a,onConfirm:l,title:c,message:o,confirmText:i="Confirm",cancelText:d="Cancel",type:r="danger",isLoading:s=!1})=>{if(!n)return null;const m=()=>{switch(r){case"danger":return e.jsx(t,{className:"w-6 h-6 text-[#A855F7]"});case"warning":return e.jsx(b,{className:"w-6 h-6 text-[#059669]"});case"info":return e.jsx(h,{className:"w-6 h-6 text-[#059669]"});case"success":return e.jsx(f,{className:"w-6 h-6 text-green-600"});default:return e.jsx(t,{className:"w-6 h-6 text-[#A855F7]"})}},u=()=>{switch(r){case"danger":return"bg-red-600 hover:bg-red-700 focus:ring-red-500";case"warning":return"bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";case"info":return"bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";case"success":return"bg-green-600 hover:bg-green-700 focus:ring-green-500";default:return"bg-red-600 hover:bg-red-700 focus:ring-red-500"}},x=()=>{switch(r){case"danger":return"bg-red-100";case"warning":return"bg-yellow-100";case"info":return"bg-blue-100";case"success":return"bg-green-100";default:return"bg-red-100"}};return e.jsxs("div",{className:"fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fadeIn",children:[e.jsxs("div",{className:"bg-card rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-scaleIn",children:[e.jsx("div",{className:"p-6 border-b border-theme",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`flex-shrink-0 w-12 h-12 ${x()} rounded-full flex items-center justify-center`,children:m()}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-xl font-semibold text-primary",children:c}),e.jsx("p",{className:"text-sm text-secondary mt-2",children:o})]}),e.jsx("button",{onClick:a,disabled:s,className:"flex-shrink-0 p-1 hover:bg-[rgba(15,31,23,0.03)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",children:e.jsx(g,{className:"w-5 h-5 text-secondary"})})]})}),e.jsxs("div",{className:"p-6 flex items-center justify-end gap-3",children:[e.jsx("button",{onClick:a,disabled:s,className:"px-6 py-2.5 border border-theme text-primary rounded-lg hover:bg-[rgba(15,31,23,0.03)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",children:d}),e.jsx("button",{onClick:l,disabled:s,className:`px-6 py-2.5 !text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${u()}`,children:s?e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsxs("svg",{className:"animate-spin h-4 w-4 !text-white",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),"Processing..."]}):i})]})]}),e.jsx("style",{children:`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `})]})};export{y as C};
