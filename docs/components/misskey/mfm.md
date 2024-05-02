<script setup>
import Box from '../Box.vue'
import Mfm from '../../../src/components/misskey/Mfm.vue'

const text = 'Hello, **world**!'
const bold = '**Bold Text**'
const italic = '<i>斜め</i>'
const strike = '~~打ち消し~~'
const inlineCode = '`inline code`'
const codeBlock = `\`\`\`\ncode block\n\`\`\``
const link = 'https://example.com'
const center = '<center>\nCenter\n</center>'

const background = '$[fg.color=f00 赤字]\n$[bg.color=ff0 黄背景]'
const spin = `$[spin 🍮] $[spin.left 🍮] $[spin.alternate 🍮]\n$[spin.x 🍮] $[spin.x,left 🍮] $[spin.x,alternate 🍮]\n$[spin.y 🍮] $[spin.y,left 🍮] $[spin.y,alternate 🍮]\n$[spin.speed=5s 🍮]`
</script>

# Mfm

## Default

<Box>
  <Mfm :text="text" />
</Box>

<Box>
  <Mfm :text="bold" />
</Box>

<Box>
  <Mfm :text="italic" />
</Box>

<Box>
  <Mfm :text="strike" />
</Box>

<Box>
  <Mfm :text="inlineCode" />
</Box>

<Box>
  <Mfm :text="codeBlock" />
</Box>

<Box>
  <Mfm :text="link" />
</Box>

<Box>
  <Mfm :text="center" />
</Box>

<Box>
  <Mfm text="misskey 検索" host="https://misskey.io" />
</Box>

<Box>
  <Mfm text="プリンはmisskey開発者の好物<small>だった気がする…</small>" />
</Box>

<Box>
  <Mfm :text="background" />
</Box>

<Box>
  <Mfm text="もりもり$[blur あ]んこ" />
</Box>

<Box>
  <Mfm text="$[font.cursive MisskeyでFediverseの世界が広がります]" />
</Box>

<Box>
  <Mfm text="$[flip MisskeyでFediverseの世界が広がります]" />
</Box>

<Box>
  <Mfm text="$[rotate.deg=30 misskey]" />
</Box>

<Box>
  <Mfm text="$[unixtime 1700000000]" />
</Box>

<Box>
  <Mfm text="$[ruby Misskey ミスキー]" />
</Box>

<Box>
  <Mfm text="$[position.x=10,y=10 位置変更]" />
</Box>

<Box>
  <Mfm text="$[scale.x=2,y=2 拡大]" />
</Box>

<Box>
  <Mfm text="$[x2 x2] $[x3 x3] $[x4 x4]" />
</Box>

<Box>
  <Mfm text="$[tada 🍮] $[tada.speed=5s 🍮]" />
</Box>

<Box>
  <Mfm text="$[jump 🍮] $[jump.speed=5s 🍮]" />
</Box>

<Box>
  <Mfm :text="spin" />
</Box>

<Box>
  <Mfm text="$[shake 🍮] $[shake.speed=5s 🍮]" />
</Box>

<Box>
  <Mfm text="$[twitch 🍮] $[twitch.speed=5s 🍮]" />
</Box>

<Box>
  <Mfm text="$[rainbow $[fg.color=f0f 色付き文字]]" />
</Box>

<Box>
  <Mfm text="$[sparkle 🍮]" />
</Box>
