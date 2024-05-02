<script lang="tsx">
// @ts-nocheck
import * as mfm from "mfm-js";
import { defineComponent, h, type PropType } from "vue";
import type { Settings } from "@shared/types/store";

export default defineComponent({
  name: "Mfm",
  props: {
    text: {
      type: String,
      required: true,
    },
    plain: {
      type: Boolean,
      default: false,
    },
    host: {
      type: String,
      default: null,
    },
    emojis: {
      type: Array as PropType<{ name: string; url: string }[]>,
      default: null,
    },
    postStyle: {
      type: String,
      default: "default" as Settings["postStyle"],
    },
  },
  methods: {
    fnStyle(nodeProps: { name: string; args: any }) {
      switch (nodeProps.name) {
        case "fg": {
          return { color: "#" + nodeProps.args.color };
        }
        case "bg": {
          return { backgroundColor: "#" + nodeProps.args.color };
        }
        case "font": {
          const fonts = ["serif", "monospace", "cursive", "fantasy"];
          return {
            fontFamily: fonts.find((font) => {
              return !!nodeProps.args[font];
            }),
          };
        }
        case "position": {
          return {
            transform: `translate(${nodeProps.args.x}px, ${nodeProps.args.y}px)`,
          };
        }
        case "scale": {
          return {
            transform: `scale(${nodeProps.args.x}, ${nodeProps.args.y})`,
          };
        }
        case "tada": {
          return {
            animation: `mfm-tada ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "spin": {
          return {
            animation: `mfm-spin ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "spinX": {
          return {
            animation: `mfm-spinX ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "spinY": {
          return {
            animation: `mfm-spinY ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "jump": {
          return {
            animation: `mfm-jump ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "bounce": {
          return {
            animation: `mfm-bounce ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "shake": {
          return {
            animation: `mfm-shake ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "twitch": {
          return {
            animation: `mfm-twitch ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        case "rainbow": {
          return {
            animation: `mfm-rainbow ${nodeProps.args.speed || "1s"} linear infinite both`,
          };
        }
        default:
          return {};
      }
    },
  },
  render() {
    if (this.text == null || this.text === "") return null;

    const ast = (this.plain ? mfm.parseSimple : mfm.parse)(this.text);
    // const enableAnimation = true; // TODO: settings

    console.log(this.text, ast);

    const fn = (node: mfm.MfmNode) => {
      switch (node.props.name) {
        case "ruby": {
          if (node.children.length === 1 && node.children[0].type === "text") {
            // テキストだけの場合
            const [text, rt] = node.children[0].props.text.split(" ");
            return (
              <ruby>
                {text}
                <rt>{rt}</rt>
              </ruby>
            );
          } else {
            // 更にネストされた場合
            const lastChild = node.children?.pop();
            return (
              <ruby>
                {node.children.map((child) => structElement([child]))}
                <rt>{structElement([lastChild])}</rt>
              </ruby>
            );
          }
        }
        default:
          return node.children.length > 0 ? (
            <span className={`mfm-fn ${node.props.name}`} style={this.fnStyle(node.props)}>
              {node.children.map((child) => structElement([child]))}
            </span>
          ) : null;
      }
    };

    const structElement = (ast: mfm.MfmNode[]) =>
      ast.map((node) => {
        switch (node.type) {
          case "text":
            return <span>{node.props.text}</span>;
          case "bold":
            return <strong>{structElement(node.children)}</strong>;
          case "blockCode":
            return <pre className={`language-${node.props.lang}`}>{node.props.code}</pre>;
          case "center":
            return <div className="center">{structElement(node.children)}</div>;
          case "emojiCode":
            return (
              <img
                className="emoji"
                src={this.emojis?.find((emoji) => emoji.name === node.props.name)?.url}
                alt={node.props.name}
                title={node.props.name}
              />
            );
          case "fn":
            return <span className="fn">{fn(node)}</span>;
          case "hashtag":
            return (
              <a
                href={this.host ? new URL(`/tags/${encodeURIComponent(node.props.hashtag)}`, this.host).toString() : ""}
                className="hashtag"
              >
                #{node.props.hashtag}
              </a>
            );
          case "inlineCode":
            return <code>{node.props.code}</code>;
          case "italic":
            return <em>{structElement(node.children)}</em>;
          case "link":
            return (
              <a href={node.props.url} rel="noopener noreferrer">
                {structElement(node.children)}
              </a>
            );
          case "mathBlock":
            return <div className="math">{node.props.formula}</div>;
          case "mathInline":
            return <span className="math">{node.props.formula}</span>;
          case "mention":
            return (
              <a href={`https://${node.props.host}/@${node.props.username}`} className="mention">
                @{node.props.username}
              </a>
            );
          case "plain":
            return <span>{structElement(node.children)}</span>;
          case "quote":
            return <blockquote>{structElement(node.children)}</blockquote>;
          case "search":
            return (
              <a
                href={new URL(`/search?q=${encodeURIComponent(node.props.query)}`, this.host).toString()}
                className="search"
              >
                {node.props.query}
              </a>
            );
          case "small":
            return <small>{structElement(node.children)}</small>;
          case "strike":
            return <del>{structElement(node.children)}</del>;
          case "unicodeEmoji":
            return <span className="emoji">{node.props.emoji}</span>;
          case "url":
            return (
              <a href={node.props.url} rel="noopener noreferrer">
                {node.props.url}
              </a>
            );
          default:
            console.error("Unknown node type", node);
            break;
        }
      });

    return h("p", { class: ["hazy-post-body", this.postStyle, { plain: this.plain }] }, structElement(ast));
  },
});
</script>
<style lang="scss">
@keyframes mfm-blink {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
  90% {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes mfm-tada {
  from {
    transform: scale3d(1, 1, 1);
  }

  10%,
  20% {
    transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg);
  }

  30%,
  50%,
  70%,
  90% {
    transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg);
  }

  40%,
  60%,
  80% {
    transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg);
  }

  to {
    transform: scale3d(1, 1, 1);
  }
}

@keyframes mfm-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes mfm-spinX {
  0% {
    transform: perspective(128px) rotateX(0deg);
  }
  100% {
    transform: perspective(128px) rotateX(360deg);
  }
}

@keyframes mfm-spinY {
  0% {
    transform: perspective(128px) rotateY(0deg);
  }
  100% {
    transform: perspective(128px) rotateY(360deg);
  }
}

@keyframes mfm-jump {
  0% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-16px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes mfm-bounce {
  0% {
    transform: translateY(0) scale(1, 1);
  }
  25% {
    transform: translateY(-16px) scale(1, 1);
  }
  50% {
    transform: translateY(0) scale(1, 1);
  }
  75% {
    transform: translateY(0) scale(1.5, 0.75);
  }
  100% {
    transform: translateY(0) scale(1, 1);
  }
}

// const val = () => `translate(${Math.floor(Math.random() * 20) - 10}px, ${Math.floor(Math.random() * 20) - 10}px)`;
// let css = '';
// for (let i = 0; i <= 100; i += 5) { css += `${i}% { transform: ${val()} }\n`; }
@keyframes mfm-twitch {
  0% {
    transform: translate(7px, -2px);
  }
  5% {
    transform: translate(-3px, 1px);
  }
  10% {
    transform: translate(-7px, -1px);
  }
  15% {
    transform: translate(0px, -1px);
  }
  20% {
    transform: translate(-8px, 6px);
  }
  25% {
    transform: translate(-4px, -3px);
  }
  30% {
    transform: translate(-4px, -6px);
  }
  35% {
    transform: translate(-8px, -8px);
  }
  40% {
    transform: translate(4px, 6px);
  }
  45% {
    transform: translate(-3px, 1px);
  }
  50% {
    transform: translate(2px, -10px);
  }
  55% {
    transform: translate(-7px, 0px);
  }
  60% {
    transform: translate(-2px, 4px);
  }
  65% {
    transform: translate(3px, -8px);
  }
  70% {
    transform: translate(6px, 7px);
  }
  75% {
    transform: translate(-7px, -2px);
  }
  80% {
    transform: translate(-7px, -8px);
  }
  85% {
    transform: translate(9px, 3px);
  }
  90% {
    transform: translate(-3px, -2px);
  }
  95% {
    transform: translate(-10px, 2px);
  }
  100% {
    transform: translate(-2px, -6px);
  }
}

// const val = () => `translate(${Math.floor(Math.random() * 6) - 3}px, ${Math.floor(Math.random() * 6) - 3}px) rotate(${Math.floor(Math.random() * 24) - 12}deg)`;
// let css = '';
// for (let i = 0; i <= 100; i += 5) { css += `${i}% { transform: ${val()} }\n`; }
@keyframes mfm-shake {
  0% {
    transform: translate(-3px, -1px) rotate(-8deg);
  }
  5% {
    transform: translate(0px, -1px) rotate(-10deg);
  }
  10% {
    transform: translate(1px, -3px) rotate(0deg);
  }
  15% {
    transform: translate(1px, 1px) rotate(11deg);
  }
  20% {
    transform: translate(-2px, 1px) rotate(1deg);
  }
  25% {
    transform: translate(-1px, -2px) rotate(-2deg);
  }
  30% {
    transform: translate(-1px, 2px) rotate(-3deg);
  }
  35% {
    transform: translate(2px, 1px) rotate(6deg);
  }
  40% {
    transform: translate(-2px, -3px) rotate(-9deg);
  }
  45% {
    transform: translate(0px, -1px) rotate(-12deg);
  }
  50% {
    transform: translate(1px, 2px) rotate(10deg);
  }
  55% {
    transform: translate(0px, -3px) rotate(8deg);
  }
  60% {
    transform: translate(1px, -1px) rotate(8deg);
  }
  65% {
    transform: translate(0px, -1px) rotate(-7deg);
  }
  70% {
    transform: translate(-1px, -3px) rotate(6deg);
  }
  75% {
    transform: translate(0px, -2px) rotate(4deg);
  }
  80% {
    transform: translate(-2px, -1px) rotate(3deg);
  }
  85% {
    transform: translate(1px, -3px) rotate(-10deg);
  }
  90% {
    transform: translate(1px, 0px) rotate(3deg);
  }
  95% {
    transform: translate(-2px, 0px) rotate(-3deg);
  }
  100% {
    transform: translate(2px, 1px) rotate(2deg);
  }
}

@keyframes mfm-rubberBand {
  from {
    transform: scale3d(1, 1, 1);
  }
  30% {
    transform: scale3d(1.25, 0.75, 1);
  }
  40% {
    transform: scale3d(0.75, 1.25, 1);
  }
  50% {
    transform: scale3d(1.15, 0.85, 1);
  }
  65% {
    transform: scale3d(0.95, 1.05, 1);
  }
  75% {
    transform: scale3d(1.05, 0.95, 1);
  }
  to {
    transform: scale3d(1, 1, 1);
  }
}

@keyframes mfm-rainbow {
  0% {
    filter: hue-rotate(0deg) contrast(150%) saturate(150%);
  }
  100% {
    filter: hue-rotate(360deg) contrast(150%) saturate(150%);
  }
}
</style>

<style scoped lang="scss">
.line-1,
.line-2,
.line-3 {
  pre {
    white-space: nowrap;
  }
}

.hazy-post-body {
  width: 100%;
  font-size: 0.6rem;
  line-height: 0.8rem;
  white-space: pre-wrap;
  a {
    color: var(--color-text-link);
    text-decoration: underline;
  }

  img.emoji {
    width: auto;
    height: var(--post-body--line-height);
    margin-bottom: -4px;
    line-height: var(--post-body--line-height);
  }

  .center {
    text-align: center;
  }

  .search {
    display: inline-flex;
    align-items: center;
    .icon {
      width: 1em;
      height: 1em;
      margin-left: 2px;
    }
  }

  .blur {
    filter: blur(6px);
    transition: filter 0.3s;

    &:hover {
      filter: none;
    }
  }

  code,
  pre {
    background-color: var(--hazy-color-black-t5);
    color: var(--color-text-code);
    padding: 0 4px;
    margin: 0 2px;
    border-radius: 2px;
    border: 1px solid var(--hazy-color-white-t2);
  }

  code: {
    display: block;
    width: 100%;
  }
}

.mfm-fn:not(.plain) {
  display: inline-block;

  &.x2 {
    font-size: 2em;
  }

  &.x3 {
    font-size: 3em;
  }

  &.x4 {
    font-size: 4em;
  }
}
</style>
