import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "V8 JavaScriptEngine",
  tagline: "V8 JavaScriptEngine",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://v8-scriptengine.codelin.vip",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "coddelin", // Usually your GitHub org/user name.
  projectName: "v8.ScriptEngine", // Usually your repo name.

  onBrokenLinks: "ignore",
  onBrokenMarkdownLinks: "warn",
  onBrokenAnchors: "ignore",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    // defaultLocale: "en",
    // locales: ["en"],
    defaultLocale: "zh-Hans",
    locales: [
      "zh-Hans",
      "zh-HK",
      "ja",
      "ko",
      "en",
      "pt",
      "es",
      "fr",
      "de",
      "ru",
    ],
    localeConfigs: {
      en: {
        label: "English",
      },
      zh: {
        label: "简体中文",
      },
      "zh-HK": {
        label: "繁體中文",
      },
      ja: {
        label: "日本語",
      },
      ko: {
        label: "한국어（韩语）",
      },
      de: {
        label: "Deutsch（德语）",
      },
      es: {
        label: "Español（西班牙语）",
      },
      fr: {
        label: "Français（法语）",
      },
      pt: {
        label: "Português（葡萄牙）",
      },
      ru: {
        label: "Русский（俄语）",
      },
    },
  },

  presets: [
    [
      "classic",
      {
        gtag: {
          trackingID: "G-DTT1T416RS",
          anonymizeIP: false,
        },
        docs: {
          routeBasePath: "/", // Serve the docs at the site's root
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          routeBasePath:"blog",
          path:"./blog",
          editUrl:
            "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "ignore",
          onUntruncatedBlogPosts: "warn",
          blogSidebarTitle: "All posts",
          blogSidebarCount: "ALL",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "V8 JavaScriptEngine",
      logo: {
        alt: "V8 JavaScriptEngine",
        src: "_img/v8.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          label: "文档",
          position: "left",
        },
        {
          to: "/features",
          // sidebarId:"featureSidebar",
          label: "JS/Wasm功能",
          position: "left",
        },
        {
          to: "/blog",
          label: "博客",
          position: "left",
        },
        {
          label: "标签",
          position: "left",
          items: [
            {
              to: "/features/tags",
              label: "JS/Wasm功能标签",
            },
            {
              to: "/blog/tags",
              label: "博客标签",
            },
          ],
        },
        {
          to: "/research-grant",
          label: "研究资助",
          position: "left",
        },
        // feature     'log branding',    'terms',    'research-grant',
        {
          to: "/logo",
          label: "品牌logo",
          position: "left",
        },
        {
          to: "/terms",
          label: "条款",
          position: "left",
        },
        {
          //多语言选择项
          type: "localeDropdown",
          position: "right",
        },
        {
          href: "https://github.com/v8/v8.dev",
          label: "GitHub",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Build",
              to: "/build",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Privacy",
              href: "https://policies.google.com/privacy",
            },
            {
              label: "𝕏",
              href: "https://x.com/v8js",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "GitHub",
              href: "https://github.com/facebook/docusaurus",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Translated by 林建有.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    [
      "@docusaurus/plugin-content-blog",
      {
        /**
         * Required for any multi-instance plugin
         */
        id: "feature-blog",
        /**
         * URL route for the blog section of your site.
         * *DO NOT* include a trailing slash.
         */
        routeBasePath: "features",
        /**
         * Path to data on filesystem relative to site dir.
         */
        path: "./features",
        onInlineAuthors:"ignore",
        blogSidebarTitle: "All posts",
        blogSidebarCount: "ALL",
      },
    ],
    [
      require.resolve("docusaurus-lunr-search"),
      {
        //需要安装的依赖    "docusaurus-lunr-search": "^3.5.0",     "@node-rs/jieba": "^2.0.1",
        // "lunr-languages": "^1.14.0",
        // 编译太慢了，就支持这两种先
        languages: ["en", "zh","ja", "ko", "fr", "de", "es", "ru", "pt"], // language codes
      },
    ],
  ],

  // Enable Mermaid for diagrams
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  headTags: [
    // add google adsense
    // <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5363852791482518"
    //  crossorigin="anonymous"></script>
    {
      tagName: "script",
      attributes: {
        async: "true",
        crossorigin: "anonymous",
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5363852791482518",
        // "data-ad-client": "ca-pub-5363852791482518",
      },
    },
  ],
};

export default config;
