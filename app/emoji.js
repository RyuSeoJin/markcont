// GitHub 이모지 코드 :smile: 중 자주 쓰는 것 (gitmoji 전부 + 얼굴 · 손 · 하트 · 기호 · 물건 · 자연). 라이브러리 없이.
// 목록에 없는 코드는 글자 그대로 둡니다. 웃음 표시 :) · <3 은 바꾸지 않습니다 (GitHub 과 같음).
// window.MarkEmoji = { smile: '😄', … }
(function () {
  const LIST = `
art 🎨|zap ⚡|fire 🔥|bug 🐛|ambulance 🚑|sparkles ✨|memo 📝|pencil 📝|rocket 🚀|lipstick 💄|tada 🎉|white_check_mark ✅|lock 🔒|closed_lock_with_key 🔐
bookmark 🔖|rotating_light 🚨|construction 🚧|green_heart 💚|arrow_down ⬇️|arrow_up ⬆️|pushpin 📌|construction_worker 👷|chart_with_upwards_trend 📈
recycle ♻️|heavy_plus_sign ➕|heavy_minus_sign ➖|wrench 🔧|hammer 🔨|globe_with_meridians 🌐|pencil2 ✏️|poop 💩|hankey 💩|shit 💩|rewind ⏪|twisted_rightwards_arrows 🔀
package 📦|alien 👽|truck 🚚|page_facing_up 📄|boom 💥|collision 💥|bento 🍱|wheelchair ♿|bulb 💡|beers 🍻|speech_balloon 💬|card_file_box 🗃️|loud_sound 🔊|mute 🔇
busts_in_silhouette 👥|children_crossing 🚸|building_construction 🏗️|iphone 📱|clown_face 🤡|egg 🥚|see_no_evil 🙈|camera_flash 📸|alembic ⚗️|mag 🔍|label 🏷️
seedling 🌱|triangular_flag_on_post 🚩|goal_net 🥅|dizzy 💫|wastebasket 🗑️|passport_control 🛂|adhesive_bandage 🩹|monocle_face 🧐|coffin ⚰️|test_tube 🧪|necktie 👔
stethoscope 🩺|bricks 🧱|technologist 🧑‍💻|money_with_wings 💸|thread 🧵|safety_vest 🦺
smile 😄|smiley 😃|grinning 😀|grin 😁|laughing 😆|satisfied 😆|joy 😂|rofl 🤣|wink 😉|blush 😊|innocent 😇|heart_eyes 😍|kissing_heart 😘|yum 😋|stuck_out_tongue 😛
sunglasses 😎|thinking 🤔|neutral_face 😐|expressionless 😑|unamused 😒|roll_eyes 🙄|smirk 😏|relieved 😌|pensive 😔|sleepy 😪|sleeping 😴|mask 😷|confused 😕
worried 😟|slightly_frowning_face 🙁|frowning_face ☹️|open_mouth 😮|astonished 😲|flushed 😳|pleading_face 🥺|cry 😢|sob 😭|scream 😱|confounded 😖|persevere 😣
disappointed 😞|sweat 😓|sweat_smile 😅|weary 😩|tired_face 😫|triumph 😤|rage 😡|angry 😠|skull 💀|slightly_smiling_face 🙂|upside_down_face 🙃|hugs 🤗
star_struck 🤩|partying_face 🥳|nerd_face 🤓|zipper_mouth_face 🤐|shushing_face 🤫|exploding_head 🤯|hushed 😯|grimacing 😬|sweat_drops 💦|zzz 💤|robot 🤖|ghost 👻
hear_no_evil 🙉|speak_no_evil 🙊|+1 👍|thumbsup 👍|-1 👎|thumbsdown 👎|ok_hand 👌|clap 👏|pray 🙏|raised_hands 🙌|wave 👋|muscle 💪|point_right 👉|point_left 👈
point_up ☝️|point_up_2 👆|point_down 👇|raised_hand ✋|hand ✋|v ✌️|crossed_fingers 🤞|handshake 🤝|writing_hand ✍️|fist_raised ✊|fist ✊|facepunch 👊|punch 👊
eyes 👀|eye 👁️|brain 🧠|raising_hand 🙋|ok_woman 🙆|no_good 🙅|bow 🙇|running 🏃|walking 🚶|dancer 💃
heart ❤️|orange_heart 🧡|yellow_heart 💛|blue_heart 💙|purple_heart 💜|black_heart 🖤|white_heart 🤍|broken_heart 💔|two_hearts 💕|sparkling_heart 💖|100 💯
star ⭐|star2 🌟|sparkle ❇️|anger 💢|warning ⚠️|no_entry ⛔|no_entry_sign 🚫|x ❌|negative_squared_cross_mark ❎|heavy_check_mark ✔️|ballot_box_with_check ☑️
heavy_multiplication_x ✖️|question ❓|grey_question ❔|exclamation ❗|heavy_exclamation_mark ❗|grey_exclamation ❕|bangbang ‼️|interrobang ⁉️|information_source ℹ️
arrow_right ➡️|arrow_left ⬅️|arrow_forward ▶️|arrow_backward ◀️|arrow_upper_right ↗️|arrow_lower_right ↘️|leftwards_arrow_with_hook ↩️|arrow_right_hook ↪️
arrows_counterclockwise 🔄|repeat 🔁|new 🆕|up 🆙|cool 🆒|free 🆓|ok 🆗|sos 🆘|top 🔝|soon 🔜|back 🔙|end 🔚
red_circle 🔴|orange_circle 🟠|yellow_circle 🟡|green_circle 🟢|blue_circle 🔵|large_blue_circle 🔵|purple_circle 🟣|brown_circle 🟤|black_circle ⚫|white_circle ⚪
red_square 🟥|orange_square 🟧|yellow_square 🟨|green_square 🟩|blue_square 🟦|purple_square 🟪|black_large_square ⬛|white_large_square ⬜
small_orange_diamond 🔸|small_blue_diamond 🔹|large_orange_diamond 🔶|large_blue_diamond 🔷|small_red_triangle 🔺|small_red_triangle_down 🔻
copyright ©️|registered ®️|tm ™️|hash #️⃣|zero 0️⃣|one 1️⃣|two 2️⃣|three 3️⃣|four 4️⃣|five 5️⃣|six 6️⃣|seven 7️⃣|eight 8️⃣|nine 9️⃣|keycap_ten 🔟
link 🔗|paperclip 📎|round_pushpin 📍|calendar 📆|date 📅|spiral_calendar 🗓️|hourglass ⌛|hourglass_flowing_sand ⏳|alarm_clock ⏰|stopwatch ⏱️|watch ⌚|bell 🔔
no_bell 🔕|mega 📣|loudspeaker 📢|thought_balloon 💭|email 📧|envelope ✉️|inbox_tray 📥|outbox_tray 📤|mailbox 📫|phone ☎️|telephone ☎️|computer 💻
desktop_computer 🖥️|keyboard ⌨️|printer 🖨️|floppy_disk 💾|cd 💿|dvd 📀|file_folder 📁|open_file_folder 📂|clipboard 📋|chart_with_downwards_trend 📉|bar_chart 📊
books 📚|book 📖|open_book 📖|notebook 📓|ledger 📒|scroll 📜|pen 🖊️|scissors ✂️|key 🔑|unlock 🔓|shield 🛡️|gear ⚙️|nut_and_bolt 🔩|hammer_and_wrench 🛠️
toolbox 🧰|magnet 🧲|mag_right 🔎|microscope 🔬|telescope 🔭|satellite 📡|battery 🔋|electric_plug 🔌|moneybag 💰|dollar 💵|credit_card 💳|gem 💎|gift 🎁
trophy 🏆|medal_sports 🏅|1st_place_medal 🥇|2nd_place_medal 🥈|3rd_place_medal 🥉|dart 🎯|game_die 🎲|video_game 🎮|musical_note 🎵|notes 🎶|headphones 🎧
microphone 🎤|camera 📷|movie_camera 🎥|tv 📺|film_strip 🎞️|balloon 🎈|confetti_ball 🎊|crown 👑|house 🏠|office 🏢|school 🏫|hospital 🏥|factory 🏭
earth_asia 🌏|earth_americas 🌎|earth_africa 🌍|world_map 🗺️|airplane ✈️|car 🚗|red_car 🚗|bus 🚌|train 🚆|ship 🚢|bike 🚲|checkered_flag 🏁
coffee ☕|tea 🍵|beer 🍺|pizza 🍕|hamburger 🍔|apple 🍎|cake 🍰|birthday 🎂|cookie 🍪|sunny ☀️|cloud ☁️|umbrella ☔|snowflake ❄️|rainbow 🌈|ocean 🌊
crescent_moon 🌙|sun_with_face 🌞|herb 🌿|four_leaf_clover 🍀|cherry_blossom 🌸|rose 🌹|sunflower 🌻|tulip 🌷|deciduous_tree 🌳|evergreen_tree 🌲|cactus 🌵
maple_leaf 🍁|fallen_leaf 🍂|cat 🐱|dog 🐶|panda_face 🐼|rabbit 🐰|fox_face 🦊|bear 🐻|tiger 🐯|penguin 🐧|unicorn 🦄|turtle 🐢|snail 🐌|whale 🐳|octopus 🐙
honeybee 🐝|bee 🐝|butterfly 🦋`;
  const map = Object.create(null);
  for (const pair of LIST.split(/[|\n]/)) {
    const m = pair.trim().match(/^(\S+)\s+(\S+)$/);
    if (m) map[m[1]] = m[2];
  }
  window.MarkEmoji = map;
})();
