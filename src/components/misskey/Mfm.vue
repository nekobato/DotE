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
