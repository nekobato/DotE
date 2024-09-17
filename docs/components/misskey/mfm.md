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

const background = '$[fg.color=f00 赤字]\n$[bg.color=ff0 黄背景]$[bg.color=00 デフォルト]'
const spin = `$[spin 🍮]$[spin.left 🍮]$[spin.alternate 🍮]\n$[spin.x 🍮]$[spin.x,left 🍮]$[spin.x,alternate 🍮]\n$[spin.y 🍮]$[spin.y,left 🍮]$[spin.y,alternate 🍮]\n$[spin.speed=5s 🍮]`
const plain = '<plain>$[x2 plain text]</plain>'

// https://misskey.io/notes/9y4e1ez19qyy0ai6
const mfmArt1 = '$[position.x=3,y=1 $[scale.x=1.3,y=1.1 $[border.radius=99,width=8,color=420 $[position.x=4.2,y=3.6 $[scale.x=.66,y=.8 $[scale.x=-15,y=-9 $[bg.color=57a :blank:]]$[position.x=-2,y=3.4 $[scale.y=5 $[blur $[scale.x=-15 $[bg.color=fa07 :blank:]]]]]$[position.x=-4,y=2 $[scale.x=2,y=2 $[scale.x=.4,y=.4 $[blur $[scale.x=3,y=3 ⚪]]]]$[position.x=-1.3 $[scale.x=3,y=3 $[blur $[scale.x=.7,y=.7 🌕]]]]]$[position.x=-25,y=3 $[scale.x=-12,y=5 ⛰$[position.x=-1.6,y=.3 $[scale.x=.5,y=0.6 $[rotate.deg=45 $[bg.color=0044 :blank:]]]]]]$[position.x=-17,y=4 $[scale.x=-13,y=5 ⛰$[position.x=-1.6,y=.3 $[scale.x=.5,y=.6 $[rotate.deg=45 $[bg.color=0044 :blank:]]]]]]\n$[position.y=6.2 $[scale.x=-15,y=5 $[bg.color=030 :blank:]]]\n$[position.x=-7,y=-3 $[rotate.deg=-3 $[scale.x=1.5,y=5 🟫]$[position.x=-2.5,y=2.8 $[rotate.deg=70 $[scale.x=1,y=2.6 🤎]]]$[position.x=-2.1,y=3 $[rotate.deg=-30 $[scale.x=1,y=2 🤎]]]$[position.x=-2.4,y=3 $[rotate.deg=-70 $[scale.x=1,y=3 🤎]]]]]$[position.x=-3.5,y=-3 $[rotate.deg=1 $[scale.x=1.5,y=5 🟫]$[position.x=-2.5,y=2.8 $[rotate.deg=70 $[scale.x=1,y=2.6 🤎]]]$[position.x=-3.1,y=3.4 $[rotate.deg=30 $[scale.x=1,y=2 🤎]]]$[position.x=-2.4,y=3 $[rotate.deg=-70 $[scale.x=1,y=3 🤎]]]]]\n$[position.x=7.5,y=-3.7 $[rotate.deg=5 $[scale.x=1.5,y=5 🟫]$[position.x=-2.5,y=2.8 $[rotate.deg=70 $[scale.x=1,y=2.6 🤎]]]$[position.x=-2.1,y=3 $[rotate.deg=-30 $[scale.x=1,y=2 🤎]]]$[position.x=-2,y=3 $[rotate.deg=-70 $[scale.x=1,y=3 🤎]]]]]$[position.x=-11.2,y=-5 $[rotate.deg=220 $[scale.x=0.7,y=3 🤎]]]$[position.x=-7,y=-3 $[scale.x=-11,y=-9 $[rotate.deg=-45 🥦$[position.x=-0.7,y=0.6 🥦]$[position.x=-1.4,y=1.1 🥦]]]]\n$[position.x=0.7,y=-14 $[scale.y=1 $[blur $[scale.x=-13,y=5 $[bg.color=0044 :blank:]]]]]$[position.y=1.5 $[scale.y=0.6 $[blur $[scale.x=-13,y=5 $[bg.color=ca4 :blank:]]]]]$[position.x=-14 $[rotate.deg=50 $[scale.x=0.4 $[blur $[scale.x=5,y=4 $[bg.color=0044 :blank:]]]]]]$[position.x=-4,y=1.6 $[rotate.deg=-10 $[scale.x=0.25 $[blur $[scale.x=5,y=4 $[bg.color=0044 :blank:]]]]]]$[position.x=2,y=1.6 $[rotate.deg=-30 $[scale.x=0.25 $[blur $[scale.x=5,y=4 $[bg.color=0044 :blank:]]]]]]$[position.x=-14,y=4 $[rotate.deg=190 $[jump.speed=1.5s $[scale.x=0.4 $[blur $[scale.x=5,y=4 $[bg.color=0044 :blank:]]]]]]]$[position.x=-7.4,y=4.5 $[rotate.deg=168 $[jump.speed=1.5s,delay=0.3s $[scale.x=0.3 $[blur $[scale.x=5,y=4 $[bg.color=0044 :blank:]]]]]]]\n$[position.x=-4,y=-4 $[jump.speed=1.5s $[scale.x=1.2,y=1.2 $[position.x=4.5,y=1 💨]$[scale.x=2,y=2 :blobcatuwu:]$[position.x=-0.5,y=-1 $[rotate.deg=30 $[scale.x=3,y=2.4 👒]]]$[position.x=-4.6 $[scale.x=1.5,y=1.5 ⚽]]$[position.x=-4.5 $[rotate.deg=17 $[scale.x=0.7,y=0.7 $[blur $[scale.x=2,y=2 $[bg.color=0045 :blank:]]]]]]]]]$[position.x=-5.5,y=-4 $[jump.speed=1.5s,delay=0.3s $[position.x=4.2,y=2 💨]$[rotate.deg=-3 $[scale.x=2,y=2 :bunhd_happy:]$[position.x=-2,y=1.4 $[scale.x=0.7,y=0.7 $[blur $[scale.x=2,y=1.3 $[bg.color=0045 :blank:]]]]]]]]\n:blank:]]]]]\n$[position.x=7.8,y=2 #1hMFMアート]\n$[scale.x=0 MFMart by @disc@misskey.io]'

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

<Box>
  <Mfm :text="plain" />
</Box>

<Box>
  <Mfm :text="mfmArt1" />
</Box>
