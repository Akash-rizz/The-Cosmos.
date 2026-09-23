import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";

const $ = s => document.querySelector(s);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    52,
    innerWidth / innerHeight,
    0.01,
    20000
);

camera.position.set(0, 20, 55);

scene.background = new THREE.Color(0x02030a);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

renderer.setSize(
    innerWidth,
    innerHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.1;

$("#scene").appendChild(renderer.domElement);


// ----------------------------------------------------
// CAMERA CONTROLS
// ----------------------------------------------------

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.055;

controls.maxDistance = 10000;


// ----------------------------------------------------
// POST PROCESSING
// ----------------------------------------------------

const composer = new EffectComposer(renderer);

composer.addPass(
    new RenderPass(
        scene,
        camera
    )
);

composer.addPass(
    new UnrealBloomPass(
        new THREE.Vector2(
            innerWidth,
            innerHeight
        ),
        0.65,
        0.65,
        0.82
    )
);

composer.addPass(
    new OutputPass()
);


// ----------------------------------------------------
// LIGHTING
// ----------------------------------------------------

scene.add(
    new THREE.AmbientLight(
        0x7380a0,
        0.16
    )
);

scene.add(
    new THREE.PointLight(
        0xffffff,
        5,
        0,
        1.4
    )
);


// ----------------------------------------------------
// STARFIELD
// ----------------------------------------------------

const stars = new THREE.BufferGeometry();

const sp = new Float32Array(
    15000 * 3
);

for (let i = 0; i < 15000; i++) {

    let r = THREE.MathUtils.randFloat(
        200,
        4000
    );

    let a =
        Math.random() *
        Math.PI *
        2;

    sp[i * 3] =
        Math.cos(a) * r;

    sp[i * 3 + 1] =
        THREE.MathUtils.randFloatSpread(
            1800
        );

    sp[i * 3 + 2] =
        Math.sin(a) * r;
}

stars.setAttribute(
    "position",
    new THREE.BufferAttribute(
        sp,
        3
    )
);

scene.add(
    new THREE.Points(
        stars,
        new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.6,
            transparent: true,
            opacity: 0.8
        })
    )
);


// ----------------------------------------------------
// SOLAR SYSTEM
// ----------------------------------------------------

const system = new THREE.Group();

scene.add(system);

let clickable = [];

let discoveries = new Set(
    JSON.parse(
        localStorage.getItem("cosmos") || "[]"
    )
);


// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

function add(o) {

    clickable.push(o);

    return o;
}


function card(
    id,
    name,
    type,
    desc,
    stats
) {

    return {
        id,
        name,
        type,
        desc,
        stats
    };
}


// ----------------------------------------------------
// GLOW SPRITE
// ----------------------------------------------------

function glow(
    p,
    c,
    s
) {

    let cv =
        document.createElement(
            "canvas"
        );

    cv.width = 64;
    cv.height = 64;

    let x =
        cv.getContext("2d");

    let g =
        x.createRadialGradient(
            32,
            32,
            1,
            32,
            32,
            32
        );

    g.addColorStop(
        0,
        c
    );

    g.addColorStop(
        1,
        "transparent"
    );

    x.fillStyle = g;

    x.fillRect(
        0,
        0,
        64,
        64
    );

    let q =
        new THREE.Sprite(
            new THREE.SpriteMaterial({
                map:
                    new THREE.CanvasTexture(
                        cv
                    ),
                transparent: true,
                depthWrite: false,
                blending:
                    THREE.AdditiveBlending
            })
        );

    q.position.copy(p);

    q.scale.setScalar(s);

    scene.add(q);
}


// ----------------------------------------------------
// SUN
// ----------------------------------------------------

const sun = add(
    new THREE.Mesh(
        new THREE.SphereGeometry(
            3.2,
            64,
            64
        ),
        new THREE.MeshBasicMaterial({
            color: 0xffb83e
        })
    )
);

sun.userData = card(
    "sun",
    "Sun",
    "STAR",
    "The star at the center of our Solar System. Its gravity controls the orbital architecture of the planets.",
    [
        [
            "Type",
            "G-type star"
        ],
        [
            "Age",
            "~4.6 billion yr"
        ],
        [
            "Diameter",
            "~1.39 million km"
        ],
        [
            "Distance",
            "1 AU from Earth"
        ]
    ]
);

system.add(sun);

glow(
    new THREE.Vector3(),
    "#ff8b2b",
    16
);


// ----------------------------------------------------
// PLANET DATA
// ----------------------------------------------------

const data = [

    [
        "Mercury",
        0.55,
        7,
        0.24,
        0x9c9488
    ],

    [
        "Venus",
        0.9,
        10,
        0.45,
        0xd6b06e
    ],

    [
        "Earth",
        1,
        14,
        0.5,
        0x4c7fba
    ],

    [
        "Mars",
        0.75,
        18,
        0.34,
        0xc45d40
    ],

    [
        "Jupiter",
        2.1,
        25,
        1.25,
        0xc99767
    ],

    [
        "Saturn",
        1.8,
        33,
        1.05,
        0xd9c18b
    ],

    [
        "Uranus",
        1.2,
        41,
        0.72,
        0x78cbd1
    ],

    [
        "Neptune",
        1.2,
        48,
        0.7,
        0x5269c9
    ]

];

const ps = [];


// ----------------------------------------------------
// CREATE PLANETS
// ----------------------------------------------------

for (
    const [
        n,
        size,
        r,
        spd,
        col
    ] of data
) {

    let pivot =
        new THREE.Object3D();

    system.add(pivot);

    let m = add(
        new THREE.Mesh(
            new THREE.SphereGeometry(
                size,
                48,
                48
            ),
            new THREE.MeshStandardMaterial({
                color: col,
                roughness: 0.82
            })
        )
    );

    m.position.x = r;

    m.userData = card(
        n.toLowerCase(),
        n,
        "PLANET",
        `A 3D educational representation of ${n}. Orbital distances and sizes are compressed so the full Solar System can be explored.`,
        [
            [
                "Type",
                n === "Jupiter" ||
                n === "Saturn"
                    ? "Gas giant"
                    : n === "Uranus" ||
                      n === "Neptune"
                        ? "Ice giant"
                        : "Terrestrial planet"
            ],

            [
                "Orbit",
                "Around Sun"
            ],

            [
                "Model",
                "Compressed scale"
            ],

            [
                "Status",
                "Observed"
            ]
        ]
    );

    pivot.add(m);

    ps.push([
        pivot,
        m,
        spd
    ]);

    let ring =
        new THREE.Mesh(
            new THREE.RingGeometry(
                r - 0.02,
                r + 0.02,
                128
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.08,
                side:
                    THREE.DoubleSide
            })
        );

    ring.rotation.x =
        Math.PI / 2;

    system.add(ring);


    // Saturn rings

    if (n === "Saturn") {

        let rr =
            new THREE.Mesh(
                new THREE.RingGeometry(
                    1.3,
                    2,
                    96
                ),
                new THREE.MeshBasicMaterial({
                    color: 0xb49e78,
                    transparent: true,
                    opacity: 0.65,
                    side:
                        THREE.DoubleSide
                })
            );

        rr.rotation.x = 0.5;

        m.add(rr);
    }
}


// ----------------------------------------------------
// MOON
// ----------------------------------------------------

const earth =
    ps[2][1];

const moonPivot =
    new THREE.Object3D();

earth.add(
    moonPivot
);

let moon = add(
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.13,
            32,
            32
        ),
        new THREE.MeshStandardMaterial({
            color: 0xaaa9a2,
            roughness: 1
        })
    )
);

moon.position.x = 1.4;

moonPivot.add(moon);

moon.userData = card(
    "moon",
    "Moon",
    "NATURAL SATELLITE",
    "Earth's natural satellite. Its gravity contributes to tides and interacts dynamically with Earth.",
    [
        [
            "Type",
            "Rocky satellite"
        ],
        [
            "Orbit",
            "Earth"
        ],
        [
            "Diameter",
            "~3,475 km"
        ],
        [
            "Distance",
            "~384,400 km"
        ]
    ]
);


// ----------------------------------------------------
// ARTIFICIAL SATELLITE
// ----------------------------------------------------

let satPivot =
    new THREE.Object3D();

earth.add(
    satPivot
);

let sat = add(
    new THREE.Mesh(
        new THREE.OctahedronGeometry(
            0.08
        ),
        new THREE.MeshStandardMaterial({
            color: 0xe7edf8,
            metalness: 0.8,
            roughness: 0.3
        })
    )
);

sat.position.set(
    2,
    0.3,
    0
);

satPivot.add(sat);

sat.userData = card(
    "satellite",
    "Artificial Satellite",
    "HUMAN-MADE OBJECT",
    "A conceptual satellite showing how an artificial object can orbit Earth.",
    [
        [
            "Orbit",
            "Earth"
        ],
        [
            "Scale",
            "Conceptual"
        ],
        [
            "Status",
            "Human-made"
        ]
    ]
);


// ----------------------------------------------------
// ASTEROID BELT
// ----------------------------------------------------

let ast =
    new THREE.Group();

system.add(ast);

for (
    let i = 0;
    i < 700;
    i++
) {

    let a =
        Math.random() *
        Math.PI *
        2;

    let r =
        21 +
        Math.random() * 5;

    let m =
        new THREE.Mesh(
            new THREE.IcosahedronGeometry(
                THREE.MathUtils.randFloat(
                    0.03,
                    0.11
                ),
                1
            ),
            new THREE.MeshStandardMaterial({
                color: 0x77736d,
                roughness: 1
            })
        );

    m.position.set(
        Math.cos(a) * r,
        THREE.MathUtils.randFloatSpread(
            1.4
        ),
        Math.sin(a) * r
    );

    m.userData = card(
        "asteroid",
        "Asteroid",
        "SMALL BODY",
        "A procedural asteroid-belt object. Real asteroid populations are catalogued individually; this is an exploration representation.",
        [
            [
                "Region",
                "Main asteroid belt"
            ],
            [
                "Model",
                "Procedural"
            ],
            [
                "Scale",
                "Compressed"
            ]
        ]
    );

    ast.add(m);

    clickable.push(m);
}


// ----------------------------------------------------
// COMET
// ----------------------------------------------------

let comet =
    new THREE.Group();

comet.position.set(
    55,
    5,
    -30
);

scene.add(comet);

let cn = add(
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.28,
            24,
            24
        ),
        new THREE.MeshStandardMaterial({
            color: 0xaaa9a0,
            roughness: 1
        })
    )
);

cn.userData = card(
    "comet",
    "Comet",
    "SMALL BODY",
    "A conceptual icy comet. Real comet tails are shaped by solar radiation and the solar wind."
);

comet.add(cn);

let ct =
    new THREE.Mesh(
        new THREE.ConeGeometry(
            0.15,
            12,
            16,
            1,
            true
        ),
        new THREE.MeshBasicMaterial({
            color: 0x9bbcff,
            transparent: true,
            opacity: 0.25,
            side:
                THREE.DoubleSide
        })
    );

ct.rotation.z =
    -Math.PI / 2;

ct.position.x = 6;

comet.add(ct);


// ----------------------------------------------------
// GALAXIES
// ----------------------------------------------------

function galaxy(
    name,
    pos,
    s,
    col,
    desc
) {

    let g =
        new THREE.Group();

    g.position.copy(pos);

    g.scale.setScalar(s);

    let core = add(
        new THREE.Mesh(
            new THREE.SphereGeometry(
                1.5,
                32,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: col
            })
        )
    );

    core.userData = card(
        name.toLowerCase(),
        name,
        "GALAXY",
        desc,
        [
            [
                "Representation",
                "Procedural 3D"
            ],
            [
                "Structure",
                "Spiral-inspired"
            ],
            [
                "Status",
                "Catalog-inspired"
            ],
            [
                "Scale",
                "Not to scale"
            ]
        ]
    );

    g.add(core);


    for (
        let i = 0;
        i < 700;
        i++
    ) {

        let a =
            Math.random() *
            Math.PI *
            2;

        let r =
            Math.pow(
                Math.random(),
                0.65
            ) * 18;

        let p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.035,
                    6,
                    6
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        Math.random() > 0.82
                            ? 0xffffff
                            : col,
                    transparent: true,
                    opacity: 0.6
                })
            );

        p.position.set(
            Math.cos(
                a + r * 0.65
            ) * r,

            THREE.MathUtils.randFloatSpread(
                1.1
            ),

            Math.sin(
                a + r * 0.65
            ) * r
        );

        g.add(p);
    }

    scene.add(g);

    return g;
}


const milky =
    galaxy(
        "Milky Way",
        new THREE.Vector3(
            180,
            45,
            -
