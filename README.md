<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#09070d" />
  <title>Twisted Rift 3D — Alpha 0.1</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app">
    <canvas id="game"></canvas>

    <div id="topHud">
      <div class="brand">TWISTED RIFT <span>3D ALPHA 0.1</span></div>
      <div id="objective">TRAINING GROUND · DEFEAT THE DUMMY</div>
      <div id="fps">-- FPS</div>
    </div>

    <div id="announcement" aria-live="polite"></div>

    <div id="targetHud">
      <strong id="targetName">NO TARGET</strong>
      <div class="bar enemy"><i id="targetHpFill"></i></div>
      <span id="targetHpText"></span>
    </div>

    <div id="playerHud">
      <div class="portrait">R</div>
      <div class="playerInfo">
        <div class="line"><strong>RAMZX</strong><span>THE DREAD MARSHAL</span><b id="levelText">LV 1</b></div>
        <div class="bar hp"><i id="hpFill"></i><b id="shieldFill"></b><span id="hpText"></span></div>
        <div class="resourceLine"><span id="statusText">READY</span><span id="killsText">KILLS 0</span></div>
      </div>
    </div>

    <div id="controlsHint">WASD move · Space attack · 1/2/3/4 skills · R reset camera</div>

    <div id="touchUi">
      <div id="joystick" aria-label="Movement joystick"><div id="stick"></div></div>
      <div id="skillPad">
        <button class="skill ult" data-action="ult"><small>4</small><span>DEADLINE</span><em></em></button>
        <button class="skill" data-action="s3"><small>3</small><span>STEP</span><em></em></button>
        <button class="skill" data-action="s2"><small>2</small><span>ORDER</span><em></em></button>
        <button class="skill" data-action="s1"><small>1</small><span>SEVER</span><em></em></button>
        <button class="skill attack" data-action="attack"><span>ATTACK</span><em></em></button>
      </div>
    </div>

    <div id="loading" class="show">
      <div class="loaderSigil">✦</div>
      <h1>TWISTED RIFT</h1>
      <p id="loadingText">Forging RAMZX into the Rift...</p>
      <small>Using your uploaded GLB as the first 3D hero model.</small>
    </div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
    }
  }
  </script>
  <script type="module" src="game.js"></script>
</body>
</html>
