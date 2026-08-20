/*
 * IBM Plex Sans, self-hosted. The design system has named it since the token
 * layer was written, but nothing ever loaded it: no @font-face, no link tag, no
 * font package. Every install fell through to the generic sans-serif, so the
 * whole product rendered in Helvetica or Arial and the tight letter-spacing the
 * type scale asks for landed on the wrong letterforms.
 *
 * Four static cuts, one per step of the --weight-* scale. @fontsource splits
 * each weight by unicode-range, so a browser fetches only the subsets a page
 * actually draws, and every face carries font-display: swap.
 */
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import { createApp, h } from "vue";
import contenteditable from "vue-contenteditable";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import App from "./App.vue";
import "./assets/app.scss";
import "./assets/vue-datepicker.scss";
import { i18n } from "./i18n";
import { FontAwesomeIcon } from "./icon.js";
import datetime from "./mixins/datetime";
import mobile from "./mixins/mobile";
import publicMixin from "./mixins/public";
import socket from "./mixins/socket";
import theme from "./mixins/theme";
import lang from "./mixins/lang";
import { router } from "./router";
import { appName } from "./util.ts";
import dayjs from "dayjs";
import timezone from "./modules/dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import { loadToastSettings } from "./util-frontend";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const app = createApp({
    mixins: [socket, theme, mobile, datetime, publicMixin, lang],
    data() {
        return {
            appName: appName,
        };
    },
    render: () => h(App),
});

app.use(router);
app.use(i18n);

app.use(Toast, loadToastSettings());
app.component("Editable", contenteditable);
app.component("FontAwesomeIcon", FontAwesomeIcon);

app.mount("#app");

// Service Worker
// Mainly for Webpush notification
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/serviceWorker.js", { scope: "/" }).catch((error) => {
        console.error("Service worker registration failed:", error);
    });
}

// Expose the vue instance for development
if (process.env.NODE_ENV === "development") {
    console.log("Dev Only: window.app is the vue instance");
    window.app = app._instance;
}
