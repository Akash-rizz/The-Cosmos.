import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

/*
  COSMOS — THE LIVING UNIVERSE
  Safe/mobile-first runtime.

  IMPORTANT:
  This version intentionally does NOT use EffectComposer/Bloom.
  The goal is to make the core Three.js scene initialize reliably first.
*/

const $ = (selector) => document.querySelector(selector);

const sceneEl = $("#scene");
const boot = $("#boot");

let scene;
let camera;
let renderer;
let controls;

let system;

let selected = null;
let travelTarget = null;

let clickable = [];
let planets = [];

let moonPivot = null;
let satellitePivot = null;
let asteroidBelt = null;
let cometGroup = null;
let blackHole = null;

let stars = null;
let sun = null;

let milkyWay = null;
let andromeda = null;
let triangulum = null;

let lastTime = performance.now();
let fpsFrames = 0;
let fpsTimer = performance.now();


/* =========================================================
   DISCOVERY STORAGE
========================================================= */

let discoveries = new Set();

try {
  discoveries = new Set(
    JSON.parse(localStorage.getItem("cosmos") || "[]")
  );
} catch (error) {
  console.warn("Local storage unavailable.");
}


/* =========================================================
   SAFE DOM HELPERS
========================================================= */

function safeText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value;
  }
}


function safeShow(selector) {
  const element = $(selector);

  if (element) {
    element.classList.remove("hidden");
  }
}


function safeHide(selector) {
  const element = $(selector);

  if (element) {
    element.classList.add("hidden");
  }
}


/* =========================================================
   ERROR HANDLER
========================================================= */

function fail(message) {

  console.error("COSMOS initialization failed:", message);

  if (!boot) {
    return;
  }

  boot.innerHTML = `
    <b>COSMOS</b>
    <span>THE LIVING UNIVERSE</span>
    <i><em></em></i>
    <small style="color:#ff9b8d">
      OBSERVATORY ERROR
    </small>

    <small
      style="
        max-width:320px;
        text-align:center;
        line-height:1.6;
        margin-top:12px;
        color:#aeb4c5;
      "
    >
      ${String(message).replace(/[<>]/g, "")}
    </small>
  `;
}


/* =========================================================
   DATA CARD
========================================================= */

function card(
  id,
  name,
  type,
  description,
  stats = []
) {

  return {
    id,
    name,
    type,
    desc: description,
    stats
  };
}


/* =========================================================
   CLICKABLE OBJECTS
========================================================= */

function addClickable(object) {

  clickable.push(object);

  return object;
}


/* =========================================================
   GLOW SPRITE
========================================================= */

function makeGlow(
  color = "#8db8ff",
  size = 10
) {

  const canvas = document.createElement("canvas");

  canvas.width = 96;
  canvas.height = 96;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(
    48,
    48,
    1,
    48,
    48,
    48
  );

  gradient.addColorStop(0, color);
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(1, "transparent");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const sprite = new THREE.Sprite(material);

  sprite.scale.setScalar(size);

  scene.add(sprite);

  return sprite;
}


/* =========================================================
   STARFIELD
========================================================= */

function makeStarfield(count = 6500) {

  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {

    const radius =
      THREE.MathUtils.randFloat(
        180,
        4200
      );

    const angle =
      Math.random() * Math.PI * 2;

    const y =
      THREE.MathUtils.randFloatSpread(2200);

    positions[i * 3] =
      Math.cos(angle) * radius;

    positions[i * 3 + 1] =
      y;

    positions[i * 3 + 2] =
      Math.sin(angle) * radius;
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material =
    new THREE.PointsMaterial({

      color: 0xdde7ff,

      size: 1.2,

      sizeAttenuation: true,

      transparent: true,

      opacity: 0.9
    });

  stars =
    new THREE.Points(
      geometry,
      material
    );

  scene.add(stars);
}


/* =========================================================
   PLANET CREATOR
========================================================= */

function makePlanet(
  name,
  radius,
  orbit,
  speed,
  color,
  description,
  type
) {

  const pivot =
    new THREE.Group();

  const material =
    new THREE.MeshStandardMaterial({

      color,

      roughness: 0.78,

      metalness: 0.02
    });

  const mesh =
    addClickable(
      new THREE.Mesh(
        new THREE.SphereGeometry(
          radius,
          48,
          32
        ),
        material
      )
    );

  mesh.position.x = orbit;

  mesh.userData =
    card(
      name.toLowerCase(),
      name,
      "PLANET",
      description,
      [
        ["Type", type],
        ["Orbit", "Around the Sun"],
        ["Scale", "Exploration-compressed"],
        ["Status", "Observed"]
      ]
    );

  pivot.add(mesh);

  system.add(pivot);

  /*
    Orbit line.
  */

  const orbitRing =
    new THREE.Mesh(

      new THREE.RingGeometry(
        orbit - 0.012,
        orbit + 0.012,
        128
      ),

      new THREE.MeshBasicMaterial({

        color: 0xaeb8cc,

        transparent: true,

        opacity: 0.09,

        side: THREE.DoubleSide
      })
    );

  orbitRing.rotation.x =
    Math.PI / 2;

  system.add(orbitRing);

  planets.push({
    pivot,
    mesh,
    speed
  });

  return mesh;
}


/* =========================================================
   GALAXY
========================================================= */

function makeGalaxy(
  name,
  position,
  scale,
  color,
  description
) {

  const group =
    new THREE.Group();

  group.position.copy(position);

  group.scale.setScalar(scale);

  /*
    Galaxy core.
  */

  const core =
    addClickable(

      new THREE.Mesh(

        new THREE.SphereGeometry(
          1.8,
          32,
          24
        ),

        new THREE.MeshBasicMaterial({
          color
        })
      )
    );

  core.userData =
    card(
      name
        .toLowerCase()
        .replaceAll(" ", "-"),

      name,

      "GALAXY",

      description,

      [
        ["Representation", "Procedural 3D model"],
        ["Structure", "Spiral-inspired"],
        ["Scale", "Not to scale"],
        ["Data", "Educational visualization"]
      ]
    );

  group.add(core);


  /*
    Galaxy stars.
  */

  const starCount = 850;

  for (
    let i = 0;
    i < starCount;
    i++
  ) {

    const arm =
      i % 2 === 0
        ? 1
        : -1;

    const angle =
      Math.random() *
      Math.PI *
      5;

    const radius =
      Math.pow(
        Math.random(),
        0.62
      ) * 22;

    const x =
      Math.cos(
        angle +
        arm *
        radius *
        0.35
      ) * radius;

    const z =
      Math.sin(
        angle +
        arm *
        radius *
        0.35
      ) * radius;

    const y =
      THREE.MathUtils.randFloatSpread(
        Math.max(
          0.35,
          2.2 -
          radius *
          0.055
        )
      );

    const star =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          Math.random() > 0.96
            ? 0.07
            : 0.035,
          6,
          6
        ),

        new THREE.MeshBasicMaterial({

          color:
            Math.random() > 0.83
              ? 0xffffff
              : color,

          transparent: true,

          opacity:
            THREE.MathUtils.randFloat(
              0.35,
              0.95
            )
        })
      );

    star.position.set(
      x,
      y,
      z
    );

    group.add(star);
  }

  scene.add(group);

  return {
    group,
    core
  };
}


/* =========================================================
   BLACK HOLE
========================================================= */

function makeBlackHole() {

  const group =
    new THREE.Group();

  group.position.set(
    -145,
    45,
    -260
  );


  /*
    Event-horizon core.
  */

  const core =
    addClickable(

      new THREE.Mesh(

        new THREE.SphereGeometry(
          2.7,
          48,
          32
        ),

        new THREE.MeshBasicMaterial({
          color: 0x000000
        })
      )
    );

  core.userData =
    card(

      "black-hole",

      "Black Hole",

      "COMPACT OBJECT",

      "A conceptual 3D representation of a black hole. The dark center represents an event-horizon region; the luminous disk represents hot accreting material.",

      [
        ["Model", "Conceptual"],
        ["Evidence", "Observed indirectly"],
        ["Disk", "Accreting material"],
        ["Lensing", "Simplified"]
      ]
    );

  group.add(core);


  /*
    Inner glowing ring.
  */

  const ring =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        6.5,
        1.15,
        24,
        160
      ),

      new THREE.MeshBasicMaterial({

        color: 0xff7135,

        transparent: true,

        opacity: 0.72,

        blending:
          THREE.AdditiveBlending
      })
    );

  ring.rotation.x =
    1.28;

  group.add(ring);


  /*
    Accretion disk.
  */

  const disk =
    new THREE.Mesh(

      new THREE.RingGeometry(
        3.8,
        14,
        160
      ),

      new THREE.MeshBasicMaterial({

        color: 0xff4f20,

        transparent: true,

        opacity: 0.18,

        side:
          THREE.DoubleSide,

        blending:
          THREE.AdditiveBlending
      })
    );

  disk.rotation.x =
    1.28;

  group.add(disk);


  const glow =
    makeGlow(
      "#ff5d2d",
      24
    );

  if (glow) {
    glow.position.copy(
      group.position
    );
  }

  scene.add(group);

  blackHole = {
    group,
    core,
    ring,
    disk
  };
}


/* =========================================================
   OBJECT INFORMATION PANEL
========================================================= */

function showObject(object) {

  if (
    !object ||
    !object.userData
  ) {
    return;
  }

  selected = object;

  const data =
    object.userData;

  safeText(
    "#ptype",
    data.type || "OBJECT"
  );

  safeText(
    "#pname",
    data.name || "Unknown"
  );

  safeText(
    "#pdesc",
    data.desc ||
      "Educational 3D visualization."
  );

  safeText(
    "#focus",
    data.name || "—"
  );

  safeText(
    "#status",
    discoveries.has(data.id)
      ? "DISCOVERED"
      : "UNRECORDED"
  );


  const stats =
    $("#stats");

  if (stats) {

    stats.innerHTML =
      (data.stats || [])
        .map(
          ([label, value]) => `
            <div class="stat">
              <b>${String(value)}</b>
              <span>${String(label)}</span>
            </div>
          `
        )
        .join("");
  }


  safeText(
    "#discover",

    discoveries.has(data.id)
      ? "DISCOVERED"
      : "MARK DISCOVERED"
  );

  safeShow("#panel");
}


/* =========================================================
   CAMERA FOCUS
========================================================= */

function focusObject(object) {

  if (!object) {
    return;
  }

  const worldPosition =
    new THREE.Vector3();

  object.getWorldPosition(
    worldPosition
  );


  let radius = 1;

  if (
    object.geometry &&
    object.geometry.parameters &&
    object.geometry.parameters.radius
  ) {

    radius =
      object.geometry
        .parameters
        .radius;
  }


  const distance =
    Math.max(
      6,
      radius * 8
    );


  const direction =
    new THREE.Vector3(
      0.7,
      0.35,
      1
    ).normalize();


  travelTarget = {

    position:
      worldPosition.clone()
        .add(
          direction.multiplyScalar(
            distance
          )
        ),

    target:
      worldPosition.clone(),

    progress: 0
  };


  showObject(object);
}


/* =========================================================
   MARK DISCOVERED
========================================================= */

function markDiscovered() {

  const id =
    selected &&
    selected.userData &&
    selected.userData.id;

  if (!id) {
    return;
  }

  discoveries.add(id);

  try {

    localStorage.setItem(
      "cosmos",
      JSON.stringify(
        [...discoveries]
      )
    );

  } catch (error) {

    console.warn(
      "Could not save discovery."
    );
  }


  safeText(
    "#disc",
    discoveries.size
  );

  safeText(
    "#status",
    "DISCOVERED"
  );

  safeText(
    "#discover",
    "DISCOVERED"
  );
}


/* =========================================================
   INFORMATION WINDOW
========================================================= */

function openInfo(
  title,
  html
) {

  safeText(
    "#infoTitle",
    title
  );

  const body =
    $("#infoBody");

  if (body) {
    body.innerHTML = html;
  }

  safeShow("#info");

  safeHide("#menuPanel");
}


/* =========================================================
   UI
========================================================= */

function setupUI() {

  $("#enter")?.addEventListener(
    "click",
    () => {
      safeHide("#welcome");
    }
  );


  $("#random")?.addEventListener(
    "click",
    () => {

      safeHide("#welcome");

      if (
        clickable.length === 0
      ) {
        return;
      }

      const object =
        clickable[
          Math.floor(
            Math.random() *
            clickable.length
          )
        ];

      focusObject(object);
    }
  );


  $("#close")?.addEventListener(
    "click",
    () => {
      safeHide("#panel");
    }
  );


  $("#infoClose")?.addEventListener(
    "click",
    () => {
      safeHide("#info");
    }
  );


  $("#menu")?.addEventListener(
    "click",
    () => {

      const menu =
        $("#menuPanel");

      if (menu) {
        menu.classList.toggle(
          "hidden"
        );
      }
    }
  );


  $("#travel")?.addEventListener(
    "click",
    () => {
      focusObject(selected);
    }
  );


  $("#discover")?.addEventListener(
    "click",
    markDiscovered
  );


  document
    .querySelectorAll(
      "[data-view]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const view =
              button.dataset.view;

            safeHide(
              "#menuPanel"
            );


            if (
              view === "solar"
            ) {

              focusObject(
                sun
              );

            }

            else if (
              view === "galaxy"
            ) {

              focusObject(
                milkyWay &&
                milkyWay.core
              );

            }

            else if (
              view === "deep"
            ) {

              focusObject(
                blackHole &&
                blackHole.core
              );

            }

            else if (
              view === "missions"
            ) {

              openInfo(
                "MISSION ARCHIVE",

                `
                  <p>
                    <b>Voyager:</b>
                    robotic exploration
                    of the outer Solar
                    System and beyond.
                  </p>

                  <p>
                    <b>Hubble:</b>
                    major observatory
                    operating across
                    visible, ultraviolet
                    and near-infrared
                    wavelengths.
                  </p>

                  <p>
                    <b>James Webb:</b>
                    infrared observatory
                    studying early
                    galaxies, stars
                    and planetary
                    systems.
                  </p>
                `
              );
            }
          }
        );
      }
    );


  $("#timeline")?.addEventListener(
    "click",
    () => {

      openInfo(
        "COSMIC TIMELINE",

        `
          <p>
            <b>~13.8 billion years ago:</b>
            the early universe.
          </p>

          <p>
            <b>First stars and galaxies:</b>
            stellar generations enrich
            the cosmos.
          </p>

          <p>
            <b>~4.6 billion years ago:</b>
            the Solar System forms.
          </p>

          <p>
            <b>Present:</b>
            observatories study
            the universe across
            many wavelengths.
          </p>
        `
      );
    }
  );


  $("#unknown")?.addEventListener(
    "click",
    () => {

      openInfo(
        "THE UNKNOWN",

        `
          <p>
            <b>Dark matter:</b>
            gravitational effects are
            inferred, but its nature
            remains unresolved.
          </p>

          <p>
            <b>Dark energy:</b>
            accelerated cosmic expansion
            is measured; its physical
            explanation remains open.
          </p>

          <p>
            <b>Quantum gravity:</b>
            a complete experimentally
            confirmed theory remains
            an open research problem.
          </p>
        `
      );
    }
  );


  safeText(
    "#disc",
    discoveries.size
  );
}


/* =========================================================
   OBJECT PICKING
========================================================= */

function setupPicking() {

  const raycaster =
    new THREE.Raycaster();

  const pointer =
    new THREE.Vector2();

  let downX = 0;
  let downY = 0;


  function pick(
    clientX,
    clientY
  ) {

    pointer.x =
      (clientX / innerWidth) *
      2 -
      1;

    pointer.y =
      -(clientY / innerHeight) *
      2 +
      1;


    raycaster.setFromCamera(
      pointer,
      camera
    );


    const hits =
      raycaster.intersectObjects(
        clickable,
        false
      );


    if (
      hits.length > 0
    ) {

      focusObject(
        hits[0].object
      );

      safeHide(
        "#welcome"
      );
    }
  }


  renderer.domElement.addEventListener(
    "pointerdown",
    (event) => {

      downX =
        event.clientX;

      downY =
        event.clientY;
    }
  );


  renderer.domElement.addEventListener(
    "pointerup",
    (event) => {

      const moved =
        Math.hypot(
          event.clientX -
            downX,

          event.clientY -
            downY
        );


      if (moved < 8) {

        pick(
          event.clientX,
          event.clientY
        );
      }
    }
  );
}


/* =========================================================
   ANIMATION LOOP
========================================================= */

function animate(time) {

  requestAnimationFrame(
    animate
  );


  const delta =
    Math.min(
      0.05,
      (time - lastTime) /
        1000 ||
        0.016
    );

  lastTime = time;


  /*
    Planet rotation + orbit.
  */

  planets.forEach(
    ({
      pivot,
      mesh,
      speed
    }) => {

      pivot.rotation.y +=
        speed * delta;

      mesh.rotation.y +=
        0.35 * delta;
    }
  );


  /*
    Moon.
  */

  if (moonPivot) {

    moonPivot.rotation.y +=
      0.65 * delta;
  }


  /*
    Artificial satellite.
  */

  if (satellitePivot) {

    satellitePivot.rotation.y +=
      0.85 * delta;
  }


  /*
    Asteroid belt.
  */

  if (asteroidBelt) {

    asteroidBelt.rotation.y +=
      0.018 * delta;
  }


  /*
    Comet.
  */

  if (cometGroup) {

    cometGroup.rotation.y +=
      0.01 * delta;
  }


  /*
    Background stars.
  */

  if (stars) {

    stars.rotation.y +=
      0.002 * delta;
  }


  /*
    Galaxies.
  */

  if (milkyWay) {

    milkyWay.group.rotation.y +=
      0.006 * delta;
  }

  if (andromeda) {

    andromeda.group.rotation.y -=
      0.004 * delta;
  }

  if (triangulum) {

    triangulum.group.rotation.y +=
      0.005 * delta;
  }


  /*
    Black hole animation.
  */

  if (blackHole) {

    blackHole.ring.rotation.z +=
      0.28 * delta;

    blackHole.disk.rotation.z -=
      0.12 * delta;
  }


  /*
    Smooth camera travel.
  */

  if (travelTarget) {

    travelTarget.progress =
      Math.min(
        1,
        travelTarget.progress +
          delta * 0.8
      );


    const eased =
      1 -
      Math.pow(
        1 -
          travelTarget.progress,
        3
      );


    camera.position.lerp(
      travelTarget.position,
      Math.min(
        0.14,
        0.055 +
          eased * 0.045
      )
    );


    controls.target.lerp(
      travelTarget.target,
      0.09
    );


    if (
      travelTarget.progress >= 1 &&
      camera.position.distanceTo(
        travelTarget.position
      ) < 0.2
    ) {

      travelTarget = null;
    }
  }


  controls.update();


  renderer.render(
    scene,
    camera
  );


  fpsFrames++;


  if (
    time - fpsTimer >
    1000
  ) {

    safeText(
      "#fps",
      `${fpsFrames} FPS`
    );

    fpsFrames = 0;

    fpsTimer = time;
  }
}


/* =========================================================
   RESIZE
========================================================= */

function resize() {

  if (
    !renderer ||
    !camera
  ) {
    return;
  }


  camera.aspect =
    innerWidth /
    innerHeight;

  camera.updateProjectionMatrix();


  const mobile =
    innerWidth < 700;


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      mobile ? 1.35 : 1.8
    )
  );


  renderer.setSize(
    innerWidth,
    innerHeight,
    false
  );
}


/* =========================================================
   BUILD UNIVERSE
========================================================= */

function buildUniverse() {

  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(
      0x010208
    );

  scene.fog =
    new THREE.FogExp2(
      0x010208,
      0.00018
    );


  camera =
    new THREE.PerspectiveCamera(
      52,

      innerWidth /
        innerHeight,

      0.01,

      20000
    );


  camera.position.set(
    0,
    16,
    58
  );


  /*
    Renderer.
  */

  renderer =
    new THREE.WebGLRenderer({

      antialias:
        innerWidth > 700,

      alpha: false,

      powerPreference:
        "high-performance",

      failIfMajorPerformanceCaveat:
        false
    });


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      innerWidth < 700
        ? 1.35
        : 1.8
    )
  );


  renderer.setSize(
    innerWidth,
    innerHeight,
    false
  );


  renderer.outputColorSpace =
    THREE.SRGBColorSpace;


  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;


  renderer.toneMappingExposure =
    1.08;


  renderer.domElement.style.display =
    "block";

  renderer.domElement.style.width =
    "100%";

  renderer.domElement.style.height =
    "100%";


  sceneEl.innerHTML = "";

  sceneEl.appendChild(
    renderer.domElement
  );


  /*
    Camera controls.
  */

  controls =
    new OrbitControls(
      camera,
      renderer.domElement
    );


  controls.enableDamping =
    true;

  controls.dampingFactor =
    0.055;

  controls.minDistance =
    2;

  controls.maxDistance =
    9000;

  controls.rotateSpeed =
    0.55;

  controls.zoomSpeed =
    0.8;

  controls.panSpeed =
    0.45;

  controls.target.set(
    0,
    0,
    0
  );


  /*
    Lighting.
  */

  scene.add(
    new THREE.HemisphereLight(
      0x9aa8d4,
      0x080a12,
      0.42
    )
  );


  const sunLight =
    new THREE.PointLight(
      0xffe0ad,
      1100,
      0,
      1.2
    );


  sunLight.position.set(
    0,
    0,
    0
  );


  scene.add(
    sunLight
  );


  /*
    Stars.
  */

  makeStarfield();


  /*
    Solar System group.
  */

  system =
    new THREE.Group();

  scene.add(system);


  /*
    SUN.
  */

  sun =
    addClickable(

      new THREE.Mesh(

        new THREE.SphereGeometry(
          3.4,
          64,
          48
        ),

        new THREE.MeshBasicMaterial({
          color: 0xffb52e
        })
      )
    );


  sun.userData =
    card(

      "sun",

      "Sun",

      "STAR",

      "The star at the center of our Solar System. Its gravity dominates the system and drives the planets' orbits.",

      [
        ["Type", "G-type star"],
        ["Age", "~4.6 billion yr"],
        ["Diameter", "~1.39 million km"],
        ["Distance", "1 AU from Earth"]
      ]
    );


  system.add(sun);


  const sunGlow =
    makeGlow(
      "#ff7b22",
      18
    );


  if (sunGlow) {

    sunGlow.position.set(
      0,
      0,
      0
    );
  }


  /*
    PLANETS.
  */

  const planetData = [

    [
      "Mercury",
      0.52,
      7.5,
      0.42,
      0x96918a,
      "Terrestrial planet"
    ],

    [
      "Venus",
      0.82,
      11,
      0.31,
      0xd4ad68,
      "Terrestrial planet"
    ],

    [
      "Earth",
      0.88,
      15,
      0.24,
      0x477dbb,
      "Terrestrial planet"
    ],

    [
      "Mars",
      0.66,
      19,
      0.20,
      0xb9553f,
      "Terrestrial planet"
    ],

    [
      "Jupiter",
      2.05,
      27,
      0.12,
      0xb89062,
      "Gas giant"
    ],

    [
      "Saturn",
      1.78,
      36,
      0.095,
      0xd3bd8e,
      "Gas giant"
    ],

    [
      "Uranus",
      1.25,
      45,
      0.075,
      0x77c8cf,
      "Ice giant"
    ],

    [
      "Neptune",
      1.22,
      54,
      0.065,
      0x526fc9,
      "Ice giant"
    ]
  ];


  let earth = null;

  let saturn = null;


  for (
    const data of planetData
  ) {

    const planet =
      makePlanet(
        data[0],
        data[1],
        data[2],
        data[3],
        data[4],

        `${data[0]} is represented as a detailed interactive educational 3D object. Real astronomical sizes and distances are compressed for exploration.`,

        data[5]
      );


    if (
      data[0] === "Earth"
    ) {

      earth = planet;
    }


    if (
      data[0] === "Saturn"
    ) {

      saturn = planet;
    }
  }


  /*
    SATURN RINGS.
  */

  if (saturn) {

    const rings =
      new THREE.Mesh(

        new THREE.RingGeometry(
          2.0,
          3.1,
          128
        ),

        new THREE.MeshStandardMaterial({

          color: 0xb9a27c,

          roughness: 0.9,

          transparent: true,

          opacity: 0.72,

          side:
            THREE.DoubleSide
        })
      );


    rings.rotation.x =
      0.48;


    saturn.add(
      rings
    );
  }


  /*
    EARTH SYSTEM.
  */

  if (earth) {

    moonPivot =
      new THREE.Group();


    earth.add(
      moonPivot
    );


    const moon =
      addClickable(

        new THREE.Mesh(

          new THREE.SphereGeometry(
            0.22,
            32,
            24
          ),

          new THREE.MeshStandardMaterial({
            color: 0xa9a8a4,
            roughness: 1
          })
        )
      );


    moon.position.x =
      2.1;


    moon.userData =
      card(

        "moon",

        "Moon",

        "NATURAL SATELLITE",

        "Earth's natural satellite. Its gravity contributes to tides and participates in the Earth-Moon system.",

        [
          ["Type", "Rocky satellite"],
          ["Orbit", "Earth"],
          ["Diameter", "~3,475 km"],
          ["Distance", "~384,400 km"]
        ]
      );


    moonPivot.add(
      moon
    );


    /*
      Artificial satellite.
    */

    satellitePivot =
      new THREE.Group();


    earth.add(
      satellitePivot
    );


    const satellite =
      addClickable(

        new THREE.Mesh(

          new THREE.OctahedronGeometry(
            0.12
          ),

          new THREE.MeshStandardMaterial({

            color: 0xe8eef8,

            metalness: 0.75,

            roughness: 0.28
          })
        )
      );


    satellite.position.set(
      2.8,
      0.5,
      0
    );


    satellite.userData =
      card(

        "satellite",

        "Artificial Satellite",

        "HUMAN-MADE OBJECT",

        "A conceptual artificial satellite used to demonstrate orbital motion around Earth.",

        [
          ["Orbit", "Earth"],
          ["Model", "Conceptual"],
          ["Status", "Human-made"]
        ]
      );


    satellitePivot.add(
      satellite
    );
  }


  /*
    ASTEROID BELT.
  */

  asteroidBelt =
    new THREE.Group();


  system.add(
    asteroidBelt
  );


  for (
    let i = 0;
    i < 520;
    i++
  ) {

    const angle =
      Math.random() *
      Math.PI *
      2;


    const radius =
      THREE.MathUtils.randFloat(
        22,
        25.5
      );


    const height =
      THREE.MathUtils.randFloatSpread(
        1.7
      );


    const rock =
      new THREE.Mesh(

        new THREE.IcosahedronGeometry(
          THREE.MathUtils.randFloat(
            0.035,
            0.12
          ),
          1
        ),

        new THREE.MeshStandardMaterial({

          color: 0x6f6b65,

          roughness: 1
        })
      );


    rock.position.set(

      Math.cos(angle) *
        radius,

      height,

      Math.sin(angle) *
        radius
    );


    rock.userData =
      card(

        "asteroid",

        "Asteroid",

        "SMALL BODY",

        "A procedural member of the main asteroid belt. Individual real asteroids have separate catalog identities.",

        [
          ["Region", "Main asteroid belt"],
          ["Model", "Procedural"],
          ["Scale", "Compressed"]
        ]
      );


    asteroidBelt.add(
      rock
    );


    /*
      Only some asteroids
      are raycast targets.
      This keeps mobile
      performance reasonable.
    */

    if (i < 80) {

      clickable.push(
        rock
      );
    }
  }


  /*
    COMET.
  */

  cometGroup =
    new THREE.Group();


  cometGroup.position.set(
    66,
    7,
    -35
  );


  scene.add(
    cometGroup
  );


  const comet =
    addClickable(

      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.34,
          24,
          18
        ),

        new THREE.MeshStandardMaterial({

          color: 0xaaa9a2,

          roughness: 1
        })
      )
    );


  comet.userData =
    card(

      "comet",

      "Comet",

      "SMALL BODY",

      "A conceptual icy comet. Real comet tails form through interaction with sunlight and the solar wind.",

      [
        ["Type", "Icy small body"],
        ["Tail", "Solar-wind driven"],
        ["Model", "Conceptual"]
      ]
    );


  cometGroup.add(
    comet
  );


  const tail =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        0.25,
        15,
        20,
        1,
        true
      ),

      new THREE.MeshBasicMaterial({

        color: 0x8ebdff,

        transparent: true,

        opacity: 0.25,

        side:
          THREE.DoubleSide
      })
    );


  tail.rotation.z =
    -Math.PI / 2;


  tail.position.x =
    7;


  cometGroup.add(
    tail
  );


  /*
    GALAXIES.
  */

  milkyWay =
    makeGalaxy(

      "Milky Way",

      new THREE.Vector3(
        175,
        55,
        -275
      ),

      5.2,

      0x9baaff,

      "Our home galaxy: a barred spiral galaxy containing the Solar System."
    );


  andromeda =
    makeGalaxy(

      "Andromeda Galaxy",

      new THREE.Vector3(
        -265,
        -35,
        -440
      ),

      7.2,

      0xffc49f,

      "A nearby major galaxy in the Local Group. The 3D scene is a scientifically inspired visualization, not a photograph."
    );


  triangulum =
    makeGalaxy(

      "Triangulum Galaxy",

      new THREE.Vector3(
        315,
        -60,
        -650
      ),

      4.2,

      0x9fc3ff,

      "A nearby spiral galaxy in the Local Group, represented here as a procedural educational model."
    );


  /*
    BLACK HOLE.
  */

  makeBlackHole();


  safeText(
    "#scale",
    "SOLAR SYSTEM"
  );


  safeText(
    "#focus",
    "SUN"
  );
}


/* =========================================================
   START
========================================================= */

function start() {

  try {

    if (!sceneEl) {

      throw new Error(
        "Scene container #scene was not found."
      );
    }


    if (
      !window.WebGLRenderingContext
    ) {

      throw new Error(
        "WebGL is not available in this browser."
      );
    }


    buildUniverse();

    setupUI();

    setupPicking();

    window.addEventListener(
      "resize",
      resize,
      {
        passive: true
      }
    );


    resize();


    /*
      Start animation only
      after everything exists.
    */

    requestAnimationFrame(
      animate
    );


    /*
      Remove boot screen
      only after renderer exists.
    */

    requestAnimationFrame(
      () => {

        if (!boot) {
          return;
        }

        boot.style.opacity =
          "0";

        setTimeout(
          () => {

            if (
              boot &&
              boot.parentNode
            ) {

              boot.remove();
            }

          },
          850
        );
      }
    );

  }

  catch (error) {

    fail(
      error?.message ||
      "Unknown initialization error."
    );
  }
}


/* =========================================================
   START COSMOS
========================================================= */

start();
