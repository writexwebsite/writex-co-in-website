import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "public", "festival-assets");
const libraryRoot = path.join(root, "library");

const svg = (title, body, viewBox = "0 0 240 240") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${title}</title><defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#26164d" flood-opacity=".2"/></filter><filter id="g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe28b"/><stop offset=".48" stop-color="#e5a52e"/><stop offset="1" stop-color="#a65d0c"/></linearGradient><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6aa84f"/><stop offset="1" stop-color="#174b35"/></linearGradient></defs>${body}</svg>`;

const petalRing = ({
  count,
  radius,
  rx,
  ry,
  fill,
  opacity = 1,
  start = 0
}) =>
  Array.from({ length: count }, (_, index) => {
    const angle = start + (360 / count) * index;
    return `<ellipse cx="120" cy="${120 - radius}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}" transform="rotate(${angle} 120 120)"/>`;
  }).join("");

const ruffledMarigold = (outer, mid, inner) =>
  svg(
    "Layered ruffled marigold flower",
    `<g filter="url(#s)">${petalRing({ count: 22, radius: 56, rx: 18, ry: 29, fill: outer, start: 5 })}${petalRing({ count: 18, radius: 37, rx: 18, ry: 25, fill: mid, start: 12 })}${petalRing({ count: 14, radius: 20, rx: 16, ry: 20, fill: inner, start: 2 })}<path d="M87 122q33-30 66 0-8 33-33 39-25-6-33-39Z" fill="${mid}" opacity=".72"/><path d="M94 109q26-25 52 0-7 24-26 29-19-5-26-29Z" fill="${inner}"/></g>`
  );

const flowerHead = (x, y, scale, colours) =>
  `<g transform="translate(${x} ${y}) scale(${scale}) translate(-120 -120)">${petalRing({ count: 18, radius: 49, rx: 17, ry: 27, fill: colours[0] })}${petalRing({ count: 14, radius: 30, rx: 16, ry: 22, fill: colours[1], start: 9 })}${petalRing({ count: 10, radius: 14, rx: 13, ry: 16, fill: colours[2], start: 2 })}</g>`;

const assets = new Map();
const add = (category, id, body) => assets.set(`${category}/${id}`, body);

add("flowers_botanicals", "marigold-yellow", ruffledMarigold("#FFD84A", "#F6B920", "#E99512"));
add("flowers_botanicals", "marigold-orange", ruffledMarigold("#FFB31A", "#F47B20", "#D94A18"));
add("flowers_botanicals", "marigold-saffron", ruffledMarigold("#FFC333", "#EE8A15", "#CB5411"));

add(
  "flowers_botanicals",
  "marigold-garland",
  svg(
    "Marigold flower garland",
    `<path d="M18 35Q360 188 702 35" fill="none" stroke="#39724A" stroke-width="10"/><path d="M18 35Q360 177 702 35" fill="none" stroke="#8DBB66" stroke-width="3"/>${Array.from({ length: 15 }, (_, i) => flowerHead(42 + i * 46, 52 + Math.sin((i / 14) * Math.PI) * 96, .22, i % 2 ? ["#FFB31A", "#F47B20", "#D94A18"] : ["#FFD84A", "#F6B920", "#E99512"])).join("")}`,
    "0 0 720 190"
  )
);

add(
  "flowers_botanicals",
  "marigold-mango-toran",
  svg(
    "Marigold and mango leaf toran",
    `<path d="M12 28Q360 92 708 28" fill="none" stroke="#6A4C24" stroke-width="8"/><path d="M12 25Q360 82 708 25" fill="none" stroke="#4E8A42" stroke-width="5"/>${Array.from({ length: 13 }, (_, i) => {
      const x = 42 + i * 53;
      const y = 37 + Math.sin((i / 12) * Math.PI) * 48;
      return `<path d="M${x} ${y}q-24 28 0 58 24-30 0-58Z" fill="url(#leaf)" transform="rotate(${i % 2 ? 10 : -10} ${x} ${y})"/>${flowerHead(x, y + 1, .17, i % 2 ? ["#FFB31A", "#F47B20", "#D94A18"] : ["#FFD84A", "#F6B920", "#E99512"])}`;
    }).join("")}`,
    "0 0 720 170"
  )
);

add(
  "flowers_botanicals",
  "lotus-pink",
  svg(
    "Layered pink lotus flower",
    `<g filter="url(#s)"><path d="M120 201Q79 170 52 119q43 7 68 44 25-37 68-44-27 51-68 82Z" fill="#D75A91"/><path d="M120 194Q81 145 82 75q43 26 38 86 5-60 38-86 1 70-38 119Z" fill="#EE8EAF"/><path d="M120 174Q100 121 120 43q20 78 0 131Z" fill="#F8B7CB"/><path d="M120 190Q55 180 25 137q62-6 95 35 33-41 95-35-30 43-95 53Z" fill="#C8447C" opacity=".9"/><path d="M120 184Q90 162 74 124q33 2 46 38 13-36 46-38-16 38-46 60Z" fill="#F6A5C2"/></g>`
  )
);

add(
  "flowers_botanicals",
  "rose-red",
  svg(
    "Layered red rose",
    `<g filter="url(#s)"><path d="M120 28q36 13 38 51 38-4 55 28-13 38-50 46 4 40-29 58-38-11-49-47-39 5-57-29 11-39 49-50-4-39 29-57Z" fill="#B91F46"/><path d="M120 55q28 8 28 36 28-4 40 18-8 27-34 35 3 28-20 40-27-8-35-34-28 3-40-20 8-27 34-35-2-27 20-39Z" fill="#E14462"/><path d="M103 85q30-14 48 11 11 23-9 42-24 20-49 1-18-17-7-38 7-12 17-16Z" fill="#F06C7F"/><path d="M103 111q18-21 38-4 9 15-4 28-18 12-34-2-9-10 0-22Z" fill="#A81940"/><path d="M110 114q13-10 23 1-1 18-18 19-11-7-5-20Z" fill="#EE7183"/></g>`
  )
);

add(
  "flowers_botanicals",
  "jasmine-cluster",
  svg(
    "Jasmine flower cluster with leaves and buds",
    `<path d="M42 187Q99 100 189 48" fill="none" stroke="#347245" stroke-width="8"/><path d="M61 155q-35-18-42 17 29 20 52-1ZM120 102q-32-25-47 9 25 27 55 5ZM170 60q-25-29-43-1 20 28 50 13Z" fill="url(#leaf)"/>${[[78,140],[116,116],[153,83],[187,55]].map(([x,y], i) => `<g transform="translate(${x} ${y}) rotate(${i*17})">${Array.from({length:5},(_,p)=>`<ellipse cx="0" cy="-17" rx="7" ry="18" fill="#FFFDF5" stroke="#D8DCCB" stroke-width="2" transform="rotate(${p*72})"/>`).join("")}<circle r="5" fill="#F2D66A"/></g>`).join("")}<g fill="#F4F1DE" stroke="#AABF96" stroke-width="2"><ellipse cx="54" cy="170" rx="6" ry="13" transform="rotate(-35 54 170)"/><ellipse cx="98" cy="126" rx="6" ry="13" transform="rotate(-20 98 126)"/></g>`
  )
);

add(
  "flowers_botanicals",
  "hibiscus-red",
  svg(
    "Red hibiscus with projecting stamen",
    `<g filter="url(#s)">${Array.from({length:5},(_,i)=>`<path d="M120 118Q58 98 53 44q50-7 75 56Z" fill="${i%2?"#E43B52":"#C91F3A"}" stroke="#A41833" stroke-width="3" transform="rotate(${i*72} 120 118)"/>`).join("")}<path d="M118 118Q136 133 166 188" fill="none" stroke="#C71E39" stroke-width="8"/><path d="M164 187q18 6 27-5M162 178q17 1 25-9M157 168q13-1 21-10" fill="none" stroke="#F0B229" stroke-width="5" stroke-linecap="round"/><circle cx="191" cy="181" r="5" fill="#F0B229"/><path d="M99 100q20 21 41 0-3 29-21 36-18-8-20-36Z" fill="#8F1735"/></g>`
  )
);

add(
  "flowers_botanicals",
  "tuberose-stem",
  svg(
    "Tuberose stem with tubular white blooms",
    `<path d="M116 220Q105 136 124 30" fill="none" stroke="#3E7D4A" stroke-width="9"/><path d="M117 176q-39-30-59 4 29 31 61 12M119 143q36-31 60 0-23 32-61 17" fill="url(#leaf)"/>${[[119,43,-12],[108,64,-35],[132,73,29],[102,90,-48],[136,103,39],[100,119,-55],[137,134,50]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0q-13 11-10 30 10 12 20 0Q13 11 0 0Z" fill="#FFFDF6" stroke="#CBD7C2" stroke-width="3"/><path d="M0 1V-14" stroke="#6B9A5A" stroke-width="4"/></g>`).join("")}`
  )
);

add(
  "flowers_botanicals",
  "chrysanthemum-gold",
  svg(
    "Golden chrysanthemum with thin layered petals",
    `<g filter="url(#s)">${petalRing({count:30,radius:62,rx:8,ry:38,fill:"#F6C541",start:3})}${petalRing({count:24,radius:42,rx:8,ry:30,fill:"#E6A31F",start:9})}${petalRing({count:18,radius:24,rx:8,ry:22,fill:"#FFD96A",start:2})}<path d="M105 116q15-23 30 0-3 26-15 31-12-5-15-31Z" fill="#D78B14"/></g>`
  )
);

add(
  "flowers_botanicals",
  "palash-branch",
  svg(
    "Palash flowers on a branch",
    `<path d="M20 205Q90 139 208 42" fill="none" stroke="#5C3A23" stroke-width="11" stroke-linecap="round"/>${[[61,163,-25],[93,135,5],[126,105,-16],[159,77,18],[188,54,-10]].map(([x,y,r],i)=>`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0q-26-42 3-56 30 9 23 47-13-20-26-8Z" fill="${i%2?"#E9471C":"#F26922"}" stroke="#A62E17" stroke-width="3"/><path d="M4-4q27-27 47-6-3 32-43 31 20-8 17-22Z" fill="#FF7B2C" stroke="#A62E17" stroke-width="3"/></g>`).join("")}`
  )
);

add(
  "flowers_botanicals",
  "pine-cone-branch",
  svg(
    "Pine branch and cone",
    `<path d="M24 194Q107 124 216 33" fill="none" stroke="#61452F" stroke-width="10"/>${Array.from({length:15},(_,i)=>{const x=32+i*12.5,y=184-i*9.5;return `<path d="M${x} ${y}l-42 ${i%2?-4:-25}M${x} ${y}l29 ${i%2?34:10}" stroke="#245A3B" stroke-width="7" stroke-linecap="round"/>`;}).join("")}<g transform="translate(131 124) rotate(-18)" filter="url(#s)"><ellipse rx="31" ry="46" fill="#8C5C35"/><path d="M-23-29Q0-8 23-29M-28-10Q0 12 28-10M-27 11Q0 31 27 11M-20 30Q0 44 20 30" fill="none" stroke="#5B3825" stroke-width="7"/></g>`
  )
);

add(
  "flowers_botanicals",
  "holly-sprig",
  svg(
    "Holly sprig with pointed leaves and red berries",
    `<path d="M35 184Q120 111 204 52" fill="none" stroke="#346447" stroke-width="8"/>${[[84,144,-35],[128,105,-20],[170,75,-5]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0Q-45-18-62-2l18 13-18 14 22 5-8 20Q-12 42 0 0Z" fill="#17583B" stroke="#0B3D2A" stroke-width="3"/><path d="M0 0Q45-18 62-2L44 11l18 14-22 5 8 20Q12 42 0 0Z" fill="#287451" stroke="#0B3D2A" stroke-width="3"/></g>`).join("")}<g fill="#C72B43" stroke="#8E1730" stroke-width="3"><circle cx="108" cy="130" r="16"/><circle cx="130" cy="135" r="15"/><circle cx="121" cy="112" r="14"/></g>`
  )
);

add(
  "flowers_botanicals",
  "mistletoe-sprig",
  svg(
    "Mistletoe sprig with rounded leaves and white berries",
    `<path d="M120 209Q114 125 83 34M119 142Q165 94 183 44" fill="none" stroke="#4D7B50" stroke-width="8"/>${[[82,47,-20],[93,77,18],[106,113,-31],[160,74,35],[145,103,-5],[119,158,24]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="17" ry="38" fill="#65965B" stroke="#3D6D46" stroke-width="3" transform="rotate(${r} ${x} ${y})"/>`).join("")}<g fill="#FFFDF3" stroke="#C7D5BF" stroke-width="3"><circle cx="104" cy="139" r="12"/><circle cx="127" cy="135" r="11"/><circle cx="153" cy="101" r="12"/><circle cx="172" cy="93" r="10"/></g>`
  )
);

add(
  "light_fire",
  "diya-brass",
  svg(
    "Traditional brass diya with flame",
    `<g filter="url(#s)"><path d="M50 137Q120 178 190 137q-18 67-70 70-52-3-70-70Z" fill="url(#gold)" stroke="#9C580C" stroke-width="6"/><path d="M55 137q65 22 130 0" fill="none" stroke="#FFE28B" stroke-width="7"/><path d="M108 141q15-25 32-5" fill="none" stroke="#5F351A" stroke-width="7" stroke-linecap="round"/><path d="M125 130q-35-43 7-96 46 52-7 96Z" fill="#FF8A18" filter="url(#g)"/><path d="M126 112q-15-24 6-51 21 26-6 51Z" fill="#FFF3A6"/><path d="M93 205h54l10 16H83Z" fill="#B46B15"/></g>`
  )
);

add(
  "light_fire",
  "diya-row",
  svg(
    "Row of traditional brass diyas",
    `${Array.from({length:7},(_,i)=>`<g transform="translate(${45+i*105} 18) scale(.38)">${svg("", `<path d="M50 137Q120 178 190 137q-18 67-70 70-52-3-70-70Z" fill="url(#gold)" stroke="#9C580C" stroke-width="7"/><path d="M108 141q15-25 32-5" fill="none" stroke="#5F351A" stroke-width="7"/><path d="M125 130q-35-43 7-96 46 52-7 96Z" fill="#FF8A18"/><path d="M126 112q-15-24 6-51 21 26-6 51Z" fill="#FFF3A6"/>`).replace(/^<svg[^>]*>|<\/svg>$/g,"")}</g>`).join("")}<path d="M18 120H742" stroke="#B56B16" stroke-width="4" opacity=".5"/>`,
    "0 0 760 140"
  )
);

add(
  "ceremonial_objects",
  "temple-bell",
  svg(
    "Temple bell with crown and clapper",
    `<g filter="url(#s)"><path d="M91 45q29-35 58 0l-12 23h-34Z" fill="url(#gold)" stroke="#91540D" stroke-width="6"/><path d="M120 64Q70 76 65 157l-23 25h156l-23-25Q170 76 120 64Z" fill="url(#gold)" stroke="#91540D" stroke-width="7"/><path d="M58 164q62 20 124 0" fill="none" stroke="#FFE599" stroke-width="8"/><path d="M120 174v23" stroke="#70400C" stroke-width="8"/><circle cx="120" cy="205" r="13" fill="#B66C13"/></g>`
  )
);

add(
  "ceremonial_objects",
  "conch-shell",
  svg(
    "Curved spiral conch shell",
    `<g filter="url(#s)"><path d="M38 153Q64 67 151 52q47-8 64 33-24 12-50 26 20 42-10 79-35 39-89 16-46-21-28-53Z" fill="#FFF3D7" stroke="#B98E5E" stroke-width="7"/><path d="M153 52q-37 37-24 77 13 40 52 51" fill="none" stroke="#D6B98C" stroke-width="8"/><path d="M129 78q33 11 36 33-21 18-42 10-12-24 6-43Z" fill="#E7C99D" stroke="#B98E5E" stroke-width="5"/><path d="M56 149q32 8 60 52M73 119q30 10 59 63M96 90q29 13 51 52" fill="none" stroke="#D8BA8D" stroke-width="5"/><path d="M183 71q29-5 37 14-20 16-48 27" fill="#805330" stroke="#5B371F" stroke-width="5"/></g>`
  )
);

add(
  "ceremonial_objects",
  "dhaak-drum",
  svg(
    "Bengali dhaak drum",
    `<g filter="url(#s)"><path d="M57 52Q120 27 183 52l-12 135q-51 28-102 0Z" fill="#A94A30" stroke="#63331F" stroke-width="7"/><ellipse cx="120" cy="53" rx="63" ry="22" fill="#E1C69A" stroke="#63331F" stroke-width="7"/><ellipse cx="120" cy="187" rx="51" ry="18" fill="#CDAE7B" stroke="#63331F" stroke-width="7"/><path d="M67 63l103 116M173 63 70 178M88 48l13 147M151 47l-11 149" fill="none" stroke="#F0D7AB" stroke-width="6"/><path d="M42 32l46 51M198 31l-45 52" stroke="#6E432A" stroke-width="9" stroke-linecap="round"/></g>`
  )
);

add(
  "ceremonial_objects",
  "dhunuchi",
  svg(
    "Handled dhunuchi incense burner",
    `<g filter="url(#s)"><path d="M62 89q58 32 116 0-8 60-58 66-50-6-58-66Z" fill="#B24D2B" stroke="#6D2D1A" stroke-width="7"/><path d="M114 153h12l18 50H96Z" fill="#C25B34" stroke="#6D2D1A" stroke-width="7"/><path d="M167 111q49 12 29 66-11 25-42 17" fill="none" stroke="#8D3A23" stroke-width="12"/><path d="M86 85q-24-41 12-61 31 23 10 58M124 83q-19-31 8-49 29 22 7 52M154 83q-13-25 9-39 23 18 5 40" fill="none" stroke="#D6D4D8" stroke-width="9" stroke-linecap="round" opacity=".8"/></g>`
  )
);

add(
  "light_fire",
  "kandil-lantern",
  svg(
    "Hanging framed festive lantern",
    `<g filter="url(#s)"><path d="M120 14v32" stroke="#5B3A22" stroke-width="7"/><path d="M78 48h84l24 35-18 93H72L54 83Z" fill="#D33C55" stroke="#7A2439" stroke-width="7"/><path d="M78 49l42 34 42-34M55 83h130M120 83v93" fill="none" stroke="#FFD66B" stroke-width="6"/><path d="M89 176l-9 43M108 176l-4 49M132 176l4 49M151 176l9 43" stroke="#D9951C" stroke-width="7"/><circle cx="120" cy="125" r="25" fill="#FFD76A" opacity=".8" filter="url(#g)"/></g>`
  )
);

add(
  "patterns",
  "alpana-bengal",
  svg(
    "Bengali alpana floor pattern",
    `<g fill="none" stroke="#B22645" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="120" cy="120" r="80"/><circle cx="120" cy="120" r="23"/><path d="M120 39q24 38 0 58-24-20 0-58ZM201 120q-38 24-58 0 20-24 58 0ZM120 201q-24-38 0-58 24 20 0 58ZM39 120q38-24 58 0-20 24-58 0Z"/><path d="M63 63q40 9 38 38-29 2-38-38ZM177 63q-9 40-38 38-2-29 38-38ZM177 177q-40-9-38-38 29-2 38 38ZM63 177q9-40 38-38 2 29-38 38Z"/></g><g fill="#E4A62C"><circle cx="120" cy="120" r="8"/><circle cx="120" cy="28" r="5"/><circle cx="212" cy="120" r="5"/><circle cx="120" cy="212" r="5"/><circle cx="28" cy="120" r="5"/></g>`
  )
);

add(
  "patterns",
  "rangoli-diya",
  svg(
    "Geometric Diwali rangoli",
    `<g filter="url(#s)">${Array.from({length:8},(_,i)=>`<path d="M120 25q32 38 0 72-32-34 0-72Z" fill="${i%2?"#F46A35":"#E73A77"}" stroke="#8D2357" stroke-width="3" transform="rotate(${i*45} 120 120)"/>`).join("")}<circle cx="120" cy="120" r="34" fill="#FFD15A" stroke="#A86716" stroke-width="6"/><path d="M96 123q24 19 48 0-6 31-24 34-18-3-24-34Z" fill="#B95B19"/><path d="M120 121q-17-22 3-45 22 25-3 45Z" fill="#FFF0A3"/></g>`
  )
);

add(
  "patterns",
  "mandala-gold",
  svg(
    "Geometric gold mandala",
    `<g fill="none" stroke="url(#gold)" stroke-width="5"><circle cx="120" cy="120" r="94"/><circle cx="120" cy="120" r="62"/><circle cx="120" cy="120" r="22"/>${Array.from({length:12},(_,i)=>`<path d="M120 27q24 35 0 63-24-28 0-63Z" transform="rotate(${i*30} 120 120)"/>`).join("")}${Array.from({length:8},(_,i)=>`<path d="M120 61q18 21 0 41-18-20 0-41Z" transform="rotate(${i*45+22.5} 120 120)"/>`).join("")}</g>`
  )
);

add(
  "holi",
  "holi-gulal-cloud",
  svg(
    "Layered Holi gulal powder cloud",
    `<g filter="url(#s)" opacity=".88"><path d="M21 151q-13-54 46-64 7-55 66-31 37-28 68 12 42 7 36 50 18 42-30 57-37 30-79 5-59 29-76-16-22 4-31-13Z" fill="#EC3D85"/><path d="M28 140q23-34 67-24-8-44 36-52 39 5 45 40 43-7 59 25-8 39-52 34-21 37-60 12-40 28-67-6-43 3-28-29Z" fill="#6B35D4" opacity=".72"/><path d="M60 98q21-37 61-15 28-26 57 3 15 33-21 46-16 29-46 10-36 19-51-12-28-8 0-32Z" fill="#18B9C8" opacity=".65"/></g><g fill="#F5B42B" opacity=".8">${[[31,81,7],[206,69,9],[221,177,5],[73,194,6],[189,204,4]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`
  )
);

add(
  "holi",
  "holi-pichkari",
  svg(
    "Decorated Holi pichkari",
    `<g filter="url(#s)" transform="rotate(-34 120 120)"><rect x="54" y="88" width="132" height="62" rx="22" fill="#7C3AED" stroke="#3D1E95" stroke-width="7"/><path d="M78 90v60M105 90v60M132 90v60M159 90v60" stroke="#F34E91" stroke-width="8"/><path d="M186 105h34v27h-34Z" fill="#F6B82E" stroke="#8D5712" stroke-width="6"/><path d="M54 104H22v28h32" fill="#19B7C6" stroke="#176B7E" stroke-width="6"/><path d="M20 118H3" stroke="#EC3D85" stroke-width="8" stroke-linecap="round"/></g><path d="M34 83Q13 52 0 37M39 77Q18 63 8 67" stroke="#EC3D85" stroke-width="8" stroke-linecap="round" opacity=".8"/>`
  )
);

add(
  "holi",
  "holi-edge-splash",
  svg(
    "Controlled Holi edge powder splash",
    `<path d="M0 230V45q36 9 54 45 42-23 66 15 15 29-7 51 38 27 12 58-27 26-63 4-24 20-62 12Z" fill="#7C3AED" opacity=".68"/><path d="M0 225V95q25 5 36 28 36-14 53 18 9 28-18 43 18 25-5 44Z" fill="#EC3D85" opacity=".72"/><path d="M0 227v-74q34-7 54 24 13 29-10 50Z" fill="#18B9C8" opacity=".72"/><g fill="#F4B928"><circle cx="137" cy="73" r="10"/><circle cx="165" cy="121" r="6"/><circle cx="149" cy="185" r="8"/></g>`
  )
);

add(
  "holi",
  "holi-colour-ribbon",
  svg(
    "Layered flowing Holi colour ribbons",
    `<path d="M0 52q180 88 360 0t360 0" fill="none" stroke="#7C3AED" stroke-width="22" opacity=".9"/><path d="M0 82q180 88 360 0t360 0" fill="none" stroke="#EC3D85" stroke-width="18" opacity=".88"/><path d="M0 109q180 88 360 0t360 0" fill="none" stroke="#18B9C8" stroke-width="15" opacity=".86"/><path d="M0 132q180 88 360 0t360 0" fill="none" stroke="#F4B928" stroke-width="10" opacity=".84"/>`,
    "0 0 720 210"
  )
);

add(
  "light_fire",
  "safe-firework-gold",
  svg(
    "Controlled low-flash gold firework",
    `<g fill="none" stroke-linecap="round">${Array.from({length:16},(_,i)=>`<path d="M120 120Q${120+Math.cos((i/16)*Math.PI*2)*54} ${120+Math.sin((i/16)*Math.PI*2)*54} ${120+Math.cos((i/16)*Math.PI*2)*96} ${120+Math.sin((i/16)*Math.PI*2)*96}" stroke="${i%2?"#FFD96A":"#E5A52E"}" stroke-width="${i%3?5:8}" opacity="${i%3?.75:.55}"/>`).join("")}</g><circle cx="120" cy="120" r="13" fill="#FFF1A6" filter="url(#g)"/><g fill="#F4C84C">${Array.from({length:12},(_,i)=>`<circle cx="${120+Math.cos((i/12)*Math.PI*2)*108}" cy="${120+Math.sin((i/12)*Math.PI*2)*108}" r="${i%2?4:6}"/>`).join("")}</g>`
  )
);

add(
  "christmas",
  "christmas-tree",
  svg(
    "Layered evergreen Christmas tree",
    `<g filter="url(#s)"><path d="M120 19l10 23 25 2-19 17 6 25-22-13-22 13 6-25-19-17 25-2Z" fill="#F4C84C"/><path d="M120 49 63 130h34l-56 73h158l-56-73h34Z" fill="#1A6A46" stroke="#0E4932" stroke-width="7"/><path d="M72 136q48 26 96 0M57 184q63 31 126 0" fill="none" stroke="#2C9467" stroke-width="8"/><path d="M105 202h30v30h-30Z" fill="#7A4B2A"/><g fill="#D84154" stroke="#8F2337" stroke-width="2">${[[90,116],[142,105],[112,151],[158,167],[78,176]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8"/>`).join("")}</g><path d="M79 98q42 25 83 0" fill="none" stroke="#F4C84C" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/></g>`
  )
);

add(
  "christmas",
  "christmas-snowman",
  svg(
    "Proportioned snowman with hat and scarf",
    `<g filter="url(#s)"><circle cx="120" cy="153" r="62" fill="#F7FCFF" stroke="#A8C7D5" stroke-width="6"/><circle cx="120" cy="72" r="44" fill="#F7FCFF" stroke="#A8C7D5" stroke-width="6"/><path d="M78 46h84v19H78ZM93 13h54v38H93Z" fill="#28394C" stroke="#142231" stroke-width="5"/><path d="M82 105q38 21 76 0l7 24q-45 20-90 0Z" fill="#C83249"/><circle cx="105" cy="66" r="5" fill="#24303D"/><circle cx="136" cy="66" r="5" fill="#24303D"/><path d="M120 75 154 84l-34 8Z" fill="#EF8A25"/><path d="M104 94q16 10 32 0" fill="none" stroke="#33485B" stroke-width="4"/><path d="M69 144 28 119M171 144l41-25" stroke="#6E4A31" stroke-width="7" stroke-linecap="round"/><circle cx="120" cy="139" r="6" fill="#33485B"/><circle cx="120" cy="166" r="6" fill="#33485B"/></g>`
  )
);

add(
  "christmas",
  "christmas-reindeer",
  svg(
    "Side profile reindeer with antlers",
    `<g filter="url(#s)"><path d="M40 148q34-60 105-35l32-26q19-19 39 2 13 17-4 33l-23 15q-10 42-49 49H63Z" fill="#A9653D" stroke="#633A25" stroke-width="7"/><path d="M72 178v39M126 181v36M164 169l18 42" stroke="#633A25" stroke-width="9" stroke-linecap="round"/><path d="M192 86q1-38 18-59M196 64l-18-20M205 47l19-18M212 87q12-35 31-49M226 61l17 3" fill="none" stroke="#633A25" stroke-width="7" stroke-linecap="round"/><circle cx="204" cy="101" r="5" fill="#1F1A18"/><circle cx="219" cy="115" r="8" fill="#C62F45"/><path d="M47 139q50 24 103-15" fill="none" stroke="#D6B26B" stroke-width="9"/></g>`
  )
);

add(
  "christmas",
  "christmas-santa-sleigh",
  svg(
    "Santa seated in a gift-filled sleigh",
    `<g filter="url(#s)"><path d="M36 127q101 34 183-5l-25 63Q99 213 36 172Z" fill="#C83249" stroke="#7F2034" stroke-width="7"/><path d="M25 188q83 38 197 0M197 175q36 0 34-28" fill="none" stroke="#D7AA45" stroke-width="9" stroke-linecap="round"/><circle cx="117" cy="89" r="42" fill="#F4C5A3" stroke="#A86043" stroke-width="5"/><path d="M75 70q43-70 88-15l-11 21q-42-19-77-6Z" fill="#C83249" stroke="#7F2034" stroke-width="6"/><circle cx="160" cy="53" r="13" fill="#FFF"/><path d="M82 99q34 47 70 0-5 53-36 53-30 0-34-53Z" fill="#FFF"/><circle cx="102" cy="84" r="4" fill="#34231E"/><circle cx="133" cy="84" r="4" fill="#34231E"/><path d="M103 108q15 11 30 0" fill="none" stroke="#9D4B3A" stroke-width="4"/><g transform="translate(160 89)"><rect width="42" height="42" rx="4" fill="#1E7250"/><path d="M21 0v42M0 19h42" stroke="#F4C84C" stroke-width="6"/></g></g>`
  )
);

add(
  "christmas",
  "christmas-gift-stack",
  svg(
    "Stack of wrapped Christmas gifts",
    `<g filter="url(#s)"><rect x="30" y="111" width="114" height="98" rx="8" fill="#C83249" stroke="#7F2034" stroke-width="6"/><path d="M87 111v98M30 153h114" stroke="#F4C84C" stroke-width="10"/><rect x="111" y="60" width="97" height="83" rx="8" fill="#1D7651" stroke="#104B35" stroke-width="6"/><path d="M159 60v83M111 96h97" stroke="#F4C84C" stroke-width="9"/><path d="M87 110q-34-39-52-8 8 33 52 17ZM87 110q34-39 52-8-8 33-52 17ZM159 59q-29-33-44-7 7 28 44 15ZM159 59q29-33 44-7-7 28-44 15Z" fill="#F4C84C" stroke="#A66B1B" stroke-width="4"/></g>`
  )
);

add(
  "christmas",
  "christmas-snowflake",
  svg(
    "Six branch crystalline snowflake",
    `<g fill="none" stroke="#B9E2F2" stroke-width="9" stroke-linecap="round">${Array.from({length:6},(_,i)=>`<g transform="rotate(${i*60} 120 120)"><path d="M120 120V25"/><path d="m120 58-23-19M120 58l23-19M120 88l-18-14M120 88l18-14"/></g>`).join("")}</g><circle cx="120" cy="120" r="10" fill="#E9F8FF"/>`
  )
);

add(
  "ceremonial_objects",
  "crescent-star-lantern",
  svg(
    "Crescent star and framed prayer lantern",
    `<path d="M89 31q-50 35-35 94 16 58 79 62-49-23-43-75 4-47 46-68-24-18-47-13Z" fill="#D8B552" stroke="#8A6821" stroke-width="6"/><path d="m160 28 8 18 20 2-15 13 5 20-18-11-17 11 5-20-15-13 20-2Z" fill="#F2D574"/><g filter="url(#s)"><path d="M135 93h66l14 24-13 86h-68l-12-86Z" fill="#13745A" stroke="#0A4A3A" stroke-width="6"/><path d="M135 93l33 26 33-26M122 117h93M168 119v84M168 65v28" fill="none" stroke="#D8B552" stroke-width="6"/><circle cx="168" cy="157" r="19" fill="#FFE69A" filter="url(#g)"/></g>`
  )
);

add(
  "national_cultural",
  "tricolour-kite",
  svg(
    "Indian tricolour kite",
    `<g filter="url(#s)"><path d="M120 22 43 112l77 77 77-77Z" fill="#FFF" stroke="#31528A" stroke-width="6"/><path d="M120 22 43 112h154Z" fill="#F08A28"/><path d="M43 112h154l-77 77Z" fill="#228B57"/><circle cx="120" cy="112" r="19" fill="none" stroke="#2455A4" stroke-width="4"/><path d="M120 93v38M101 112h38M107 99l26 26M133 99l-26 26" stroke="#2455A4" stroke-width="3"/><path d="M120 189q31 17 5 35-29-17-5-35Z" fill="#6B35D4"/></g>`
  )
);

add(
  "national_cultural",
  "tricolour-ribbon",
  svg(
    "Flowing Indian tricolour ribbon",
    `<path d="M0 43q180 68 360 0t360 0" fill="none" stroke="#F08A28" stroke-width="27"/><path d="M0 76q180 68 360 0t360 0" fill="none" stroke="#F7F5ED" stroke-width="27"/><path d="M0 109q180 68 360 0t360 0" fill="none" stroke="#228B57" stroke-width="27"/><circle cx="360" cy="83" r="18" fill="none" stroke="#2455A4" stroke-width="4"/>`,
    "0 0 720 180"
  )
);

add(
  "axo_accessories",
  "axo-holi-pichkari",
  svg(
    "Axo Holi pichkari and scarf overlay",
    `<path d="M42 72q78 43 156 0l-18 39q-60 35-120 0Z" fill="#EC3D85" opacity=".9"/><g transform="translate(125 105) rotate(-30)"><rect width="89" height="32" rx="12" fill="#7C3AED" stroke="#3D1E95" stroke-width="5"/><path d="M89 8h27v16H89ZM0 9h-20v14H0" fill="#F4B928"/></g><path d="M225 80q18-22 34-27M224 88q28-2 38 10" stroke="#18B9C8" stroke-width="7" stroke-linecap="round"/>`,
    "0 0 280 220"
  )
);
add(
  "axo_accessories",
  "axo-diwali-scarf",
  svg(
    "Axo Diwali scarf overlay",
    `<path d="M37 71q83 47 166 0l-17 42q-66 37-132 0Z" fill="#D83C43" stroke="#8D1D2E" stroke-width="5"/><path d="M58 87q62 25 124 0" fill="none" stroke="#F2B52B" stroke-width="8"/><g transform="translate(96 116) scale(.32)">${svg("", `<path d="M50 137Q120 178 190 137q-18 67-70 70-52-3-70-70Z" fill="url(#gold)"/><path d="M125 130q-35-43 7-96 46 52-7 96Z" fill="#FF8A18"/>`).replace(/^<svg[^>]*>|<\/svg>$/g,"")}</g>`,
    "0 0 240 220"
  )
);
add(
  "axo_accessories",
  "axo-durga-puja",
  svg(
    "Axo Bengali festive scarf and dhaak overlay",
    `<path d="M35 70q85 48 170 0l-18 43q-67 39-134 0Z" fill="#F7F2E8" stroke="#B51E38" stroke-width="6"/><path d="M58 88q62 26 124 0" fill="none" stroke="#B51E38" stroke-width="8"/><g transform="translate(137 112) scale(.34)"><path d="M57 52Q120 27 183 52l-12 135q-51 28-102 0Z" fill="#A94A30" stroke="#63331F" stroke-width="7"/><path d="M67 63l103 116M173 63 70 178" stroke="#F0D7AB" stroke-width="6"/></g>`,
    "0 0 260 230"
  )
);
add(
  "axo_accessories",
  "axo-christmas-hat",
  svg(
    "Axo Santa hat and winter scarf overlay",
    `<path d="M47 74q52-83 127-45 31 17 34 53-67-30-161-8Z" fill="#C83249" stroke="#7F2034" stroke-width="6"/><path d="M42 72q86-23 171 11" fill="none" stroke="#FFF" stroke-width="18" stroke-linecap="round"/><circle cx="181" cy="34" r="18" fill="#FFF"/><path d="M39 126q82 42 164 0l-19 40q-63 36-126 0Z" fill="#1E7250" stroke="#104B35" stroke-width="6"/><path d="M65 143q57 22 113 0" stroke="#F4C84C" stroke-width="7"/>`,
    "0 0 250 220"
  )
);

const packDefinitions = [
  { slug: "durga-puja", palette: ["#B51E38", "#F1A72C", "#F8F0E7"], rail: "marigold-mango-toran", hero: "alpana-bengal", axo: "axo-durga-puja", effect: "sway" },
  { slug: "diwali", palette: ["#8B2C13", "#F2A51A", "#FFF0B8"], rail: "marigold-mango-toran", hero: "rangoli-diya", axo: "axo-diwali-scarf", effect: "diwali_lights" },
  { slug: "holi", palette: ["#6D28D9", "#EC4899", "#22B8CF"], rail: "holi-edge-splash", hero: "holi-gulal-cloud", axo: "axo-holi-pichkari", effect: "holi_spray" },
  { slug: "christmas", palette: ["#176B45", "#C62F45", "#E5B94B"], rail: "pine-cone-branch", hero: "christmas-tree", axo: "axo-christmas-hat", effect: "christmas_reindeer" },
  { slug: "new-year", palette: ["#313E93", "#D8A84B", "#F0DDFE"], rail: "tricolour-ribbon", hero: "mandala-gold", axo: "axo-christmas-hat", effect: "confetti" },
  { slug: "independence-day", palette: ["#F07B22", "#198754", "#2459A6"], rail: "tricolour-ribbon", hero: "tricolour-kite", axo: "axo-diwali-scarf", effect: "national_ribbon" },
  { slug: "republic-day", palette: ["#F07B22", "#198754", "#2459A6"], rail: "tricolour-ribbon", hero: "tricolour-kite", axo: "axo-diwali-scarf", effect: "national_ribbon" },
  { slug: "janmashtami", palette: ["#245B91", "#2E7D5A", "#D8A735"], rail: "marigold-garland", hero: "lotus-pink", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "ganesh-chaturthi", palette: ["#B43A25", "#EE9C27", "#F8DCA8"], rail: "marigold-mango-toran", hero: "lotus-pink", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "eid-al-fitr", palette: ["#087A55", "#D7B15B", "#E9F5EB"], rail: "crescent-star-lantern", hero: "crescent-star-lantern", axo: "axo-diwali-scarf", effect: "eid_lanterns" },
  { slug: "eid-al-adha", palette: ["#087A55", "#D7B15B", "#E9F5EB"], rail: "crescent-star-lantern", hero: "crescent-star-lantern", axo: "axo-diwali-scarf", effect: "eid_lanterns" },
  { slug: "onam", palette: ["#2E7D32", "#E9A23B", "#B83A2C"], rail: "jasmine-cluster", hero: "marigold-garland", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "raksha-bandhan", palette: ["#A72A55", "#D69B36", "#F6C5D8"], rail: "marigold-garland", hero: "rose-red", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "navratri", palette: ["#A71930", "#EAA52B", "#6C2E91"], rail: "marigold-mango-toran", hero: "rangoli-diya", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "poila-boishakh", palette: ["#A71930", "#F1EEE7", "#E3A328"], rail: "marigold-garland", hero: "alpana-bengal", axo: "axo-durga-puja", effect: "sway" },
  { slug: "valentines-day", palette: ["#B3225B", "#F283A8", "#F7D4E1"], rail: "rose-red", hero: "rose-red", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "halloween", palette: ["#5B2A86", "#F28A22", "#242138"], rail: "kandil-lantern", hero: "kandil-lantern", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "teachers-day", palette: ["#263B84", "#D69A34", "#C6D7F4"], rail: "mandala-gold", hero: "tricolour-kite", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "womens-day", palette: ["#7C2D92", "#E55A8B", "#F1C8E2"], rail: "rose-red", hero: "hibiscus-red", axo: "axo-diwali-scarf", effect: "sway" },
  { slug: "company-anniversary", palette: ["#5B22D7", "#E14587", "#F05B2D"], rail: "mandala-gold", hero: "holi-gulal-cloud", axo: "axo-christmas-hat", effect: "confetti" },
  { slug: "custom-event", palette: ["#5B22D7", "#E14587", "#F05B2D"], rail: "marigold-garland", hero: "mandala-gold", axo: "axo-christmas-hat", effect: "confetti" }
];

const embeddedAsset = (id) => {
  for (const [key, content] of assets) {
    if (key.endsWith(`/${id}`)) {
      return {
        key,
        uri: `data:image/svg+xml,${encodeURIComponent(content)}`
      };
    }
  }
  throw new Error(`Unknown motif ${id}`);
};

const embeddedImage = (id, x, y, width, height, opacity = 1) =>
  `<image href="${embeddedAsset(id).uri}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`;

const packScene = (pack, role) => {
  const [primary, secondary, accent] = pack.palette;
  if (role === "header") {
    return svg(
      `${pack.slug} approved header composition`,
      `<path d="M0 15Q720 105 1440 15" fill="none" stroke="${primary}" stroke-width="4" opacity=".35"/>${embeddedImage(pack.rail, 80, 3, 1280, 150)}${pack.slug === "christmas" ? `${embeddedImage("christmas-snowflake", 60, 35, 70, 70, .8)}${embeddedImage("christmas-snowflake", 1300, 48, 55, 55, .7)}` : ""}`,
      "0 0 1440 180"
    );
  }
  if (role === "hero") {
    return svg(
      `${pack.slug} approved hero composition`,
      `<path d="M640 0Q360 80 160 310 40 460 0 640h640Z" fill="${accent}" opacity=".09"/><path d="M640 44Q420 92 260 282 146 418 70 640" fill="none" stroke="${secondary}" stroke-width="10" opacity=".18"/>${embeddedImage(pack.hero, 340, 65, 270, 270, .78)}${embeddedImage(pack.rail, 185, 370, 390, 170, .35)}`,
      "0 0 640 640"
    );
  }
  if (role === "axo") {
    return svg(
      `${pack.slug} approved Axo overlay`,
      embeddedImage(pack.axo, 0, 0, 240, 220),
      "0 0 240 220"
    );
  }
  if (role === "login") {
    return svg(
      `${pack.slug} approved login composition`,
      `<path d="M0 0h520Q230 160 0 470Z" fill="${primary}" opacity=".08"/><path d="M1600 1000h-520q310-155 520-500Z" fill="${secondary}" opacity=".08"/>${embeddedImage(pack.hero, 50, 100, 310, 310, .32)}${embeddedImage(pack.rail, 1110, 720, 420, 190, .28)}`,
      "0 0 1600 1000"
    );
  }
  return svg(
    `${pack.slug} approved motif icon`,
    `<circle cx="120" cy="120" r="104" fill="${accent}" opacity=".32"/><circle cx="120" cy="120" r="98" fill="none" stroke="${secondary}" stroke-width="5" opacity=".55"/>${embeddedImage(pack.hero, 46, 46, 148, 148)}`,
    "0 0 240 240"
  );
};

for (const [key, content] of assets) {
  const output = path.join(libraryRoot, `${key}.svg`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, content);
}

for (const pack of packDefinitions) {
  const folders = ["header", "hero", "axo", "overlays", "icons"];
  await Promise.all(
    folders.map((folder) =>
      mkdir(path.join(root, pack.slug, folder), { recursive: true })
    )
  );
  await Promise.all([
    writeFile(path.join(root, pack.slug, "header", "scene.svg"), packScene(pack, "header")),
    writeFile(path.join(root, pack.slug, "hero", "corner-accent.svg"), packScene(pack, "hero")),
    writeFile(path.join(root, pack.slug, "axo", "outfit-overlay.svg"), packScene(pack, "axo")),
    writeFile(path.join(root, pack.slug, "overlays", "login-corners.svg"), packScene(pack, "login")),
    writeFile(path.join(root, pack.slug, "icons", "motif.svg"), packScene(pack, "icon"))
  ]);
}

await writeFile(
  path.join(root, "christmas", "header", "reindeer.svg"),
  assets.get("christmas/christmas-reindeer")
);
await writeFile(
  path.join(root, "christmas", "header", "gift.svg"),
  assets.get("christmas/christmas-gift-stack")
);

const manifest = {
  version: 2,
  generatedAt: "source-controlled",
  illustrationFamily: "WriteX soft-dimensional festival",
  qualityGate: "approved_assets_only",
  library: Object.fromEntries(
    [...assets.keys()].map((key) => {
      const [, id] = key.split("/");
      return [
        id,
        {
          path: `/festival-assets/library/${key}.svg`,
          qualityStatus: "approved",
          fixedVersion: 2
        }
      ];
    })
  ),
  packs: Object.fromEntries(
    packDefinitions.map((pack) => [
      pack.slug,
      {
        slug: pack.slug,
        palette: {
          primary: pack.palette[0],
          secondary: pack.palette[1],
          accent: pack.palette[2]
        },
        assets: {
          headerScene: `/festival-assets/${pack.slug}/header/scene.svg`,
          heroAccent: `/festival-assets/${pack.slug}/hero/corner-accent.svg`,
          axoOutfit: `/festival-assets/${pack.slug}/axo/outfit-overlay.svg`,
          loginOverlay: `/festival-assets/${pack.slug}/overlays/login-corners.svg`,
          icon: `/festival-assets/${pack.slug}/icons/motif.svg`
        },
        motifs: {
          rail: pack.rail,
          hero: pack.hero,
          axo: pack.axo
        },
        effect: pack.effect,
        approvalState: "approved"
      }
    ])
  )
};

await writeFile(
  path.join(root, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Generated ${assets.size} reviewed motifs and ${packDefinitions.length} fixed festival packs in ${root}.`
);
