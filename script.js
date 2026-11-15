(function () {
  'use strict';
  // 선택자로 요소 하나 찾기
  const $ = (s) => document.querySelector(s);
  // 태그·클래스·내용으로 새 요소 만들기
  const el = (t, c, h) => {
    const e = document.createElement(t);

    if (c) e.className = c;
    if (h != null) e.innerHTML = h;
    return e;
  };

  // 값을 최소·최대 범위 안으로 제한
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 부드러운 가속·감속 곡선
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // 시드 기반 난수 생성기 (항상 같은 그림이 나오도록)
  function mul(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ═════════ 소리 (모두 WebAudio 합성) ═════════ */
  const A = {
    c: null,
    m: null,
    mute: false,
    clk: 0,
    rum: null,
    // 오디오 컨텍스트 준비 (첫 클릭 때 호출)
    init() {
      if (this.c) {
        try {
          this.c.resume();
        } catch (e) {}
        return;
      }

      try {
        const C = window.AudioContext || window.webkitAudioContext;
        this.c = new C();

        this.m = this.c.createGain();
        this.m.gain.value = this.mute ? 0 : 0.8;
        this.m.connect(this.c.destination);

        const n = this.c.sampleRate * 2,
          b = this.c.createBuffer(1, n, this.c.sampleRate),
          d = b.getChannelData(0);

        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.nb = b;
      } catch (e) {
        this.c = null;
      }
    },
    // 전체 소리 켜기/끄기
    setMute(v) {
      this.mute = v;
      if (this.m) this.m.gain.value = v ? 0 : 0.8;
    },
    // 필터를 거친 잡음 한 번 재생 (효과음의 기본 재료)
    noise(dur, freq, q, vol, type, when) {
      if (!this.c) return;
      const t = this.c.currentTime + (when || 0),
        s = this.c.createBufferSource();
      s.buffer = this.nb;
      s.loop = true;

      const f = this.c.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;

      const g = this.c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      s.connect(f);
      f.connect(g);
      g.connect(this.m);
      s.start(t, Math.random());
      s.stop(t + dur + 0.05);
    },

    // 지정한 높이의 음 한 번 재생
    tone(freq, dur, vol, type, when, att) {
      if (!this.c) return;
      const t = this.c.currentTime + (when || 0),
        o = this.c.createOscillator(),
        g = this.c.createGain();

      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + (att || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      o.connect(g);
      g.connect(this.m);
      o.start(t);
      o.stop(t + dur + 0.05);
    },

    // 달리는 열차의 낮은 진동과 덜컹 소리 켜기/끄기
    rumble(on) {
      if (!this.c) return;
      if (on && !this.rum) {
        const s = this.c.createBufferSource();
        s.buffer = this.nb;
        s.loop = true;
        const f = this.c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 110;

        const g = this.c.createGain();
        g.gain.value = 0.0001;
        g.gain.linearRampToValueAtTime(0.4, this.c.currentTime + 1.2);

        s.connect(f);
        f.connect(g);
        g.connect(this.m);
        s.start();
        this.rum = { s, g };

        const clack = () => {
          this.noise(0.1, 150, 1, 0.3, 'lowpass');
          this.noise(0.1, 130, 1, 0.25, 'lowpass', 0.14);
        };

        clack();
        this.clk = setInterval(clack, 640);
      } else if (!on && this.rum) {
        clearInterval(this.clk);
        const r = this.rum;
        this.rum = null;

        try {
          r.g.gain.cancelScheduledValues(this.c.currentTime);
          r.g.gain.setValueAtTime(0.0001, this.c.currentTime);
          r.s.stop(this.c.currentTime + 0.05);
        } catch (e) {}
      }
    },
    // 기적 소리
    whistle() {
      [392, 494, 587].forEach((f) => {
        this.tone(f, 2.4, 0.07, 'triangle', 0, 0.18);
        this.tone(f * 1.005, 2.4, 0.04, 'sawtooth', 0, 0.25);
      });
      this.noise(2.2, 2600, 1.5, 0.03, 'bandpass');
    },
    // 제목이 나타날 때의 웅장한 화음
    grand() {
      this.tone(55, 2.6, 0.6, 'sine', 0, 0.02);
      this.noise(0.5, 90, 0.8, 0.7, 'lowpass');
      [73.4, 110, 146.8, 220, 293.7, 349.2, 440].forEach((f, i) =>
        this.tone(f, 8, 0.09 - i * 0.008, i < 3 ? 'sine' : 'triangle', 0.1 + i * 0.12, 1.6),
      );
    },
    // 객실의 박수 소리
    applause(d) {
      this.duck(d + 0.5);
      for (let i = 0; i < d * 70; i++)
        this.noise(
          0.03 + Math.random() * 0.03,
          1400 + Math.random() * 2200,
          1.2,
          0.09 + Math.random() * 0.1,
          'bandpass',
          Math.random() * d,
        );
    },
    /* 박수처럼 또렷이 들려야 할 소리 동안 빗소리·열차 소리를 잠깐 낮춘다 */
    duck(d) {
      if (!this.c) return;
      const t = this.c.currentTime;
      [this.rn && this.rn.g, this.rum && this.rum.g].forEach((g) => {
        if (!g) return;
        const v = g.gain.value;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(v, t);
        g.gain.linearRampToValueAtTime(v * 0.25, t + 0.4);
        g.gain.setValueAtTime(v * 0.25, t + d);
        g.gain.linearRampToValueAtTime(v, t + d + 1.2);
      });
    },
    // 시계 초침 소리
    tick() {
      this.noise(0.03, 3200, 6, 0.18, 'bandpass');
    },
    // 시계 유리에 금 가는 소리
    crack() {
      this.noise(0.16, 650, 1.2, 0.55, 'lowpass');
      this.tone(95, 0.3, 0.35, 'sine');
      this.noise(0.05, 2400, 5, 0.12, 'bandpass', 0.02);
    },
    /* 슬픈 장면: 맑은 유리 소리 대신 둔탁하게 부서지는 소리와 낮은 울림 */
    shatter() {
      this.noise(0.7, 900, 0.7, 0.5, 'lowpass');
      this.tone(58, 1.1, 0.55, 'sine', 0, 0.01);
      this.tone(110, 3.2, 0.07, 'sine', 0.15, 0.6);
      this.tone(130.8, 3.2, 0.045, 'sine', 0.2, 0.8);
      for (let i = 0; i < 9; i++)
        this.noise(
          0.05 + Math.random() * 0.05,
          1800 + Math.random() * 1400,
          5,
          0.05,
          'bandpass',
          0.1 + Math.random() * 1.1,
        );
    },
    /* 똑 — 물방울 */
    drip(w) {
      if (!this.c) return;
      const t = this.c.currentTime + (w || 0),
        o = this.c.createOscillator(),
        g = this.c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(85, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(this.m);
      o.start(t);
      o.stop(t + 0.2);
      this.noise(0.05, 450, 1, 0.12, 'lowpass', w || 0);
    },
    /* 닫힌 문: 덜컹, 덜컹 */
    locked() {
      this.noise(0.1, 170, 1.2, 0.75, 'lowpass');
      this.tone(68, 0.22, 0.4, 'sine');
      this.noise(0.18, 1500, 5, 0.1, 'bandpass', 0.01);
      this.noise(0.1, 160, 1.2, 0.6, 'lowpass', 0.2);
      this.tone(60, 0.24, 0.32, 'sine', 0.2);
      this.noise(0.3, 2300, 8, 0.06, 'bandpass', 0.22);
    },
    /* 다음 칸으로: 미닫이문이 열리고 발걸음이 이어진다 */
    door() {
      this.noise(0.55, 520, 1.4, 0.22, 'bandpass');
      this.noise(0.5, 2600, 2, 0.035, 'bandpass', 0.05);
      this.tone(84, 0.28, 0.34, 'sine', 0.5);
      this.noise(0.08, 1900, 5, 0.13, 'bandpass', 0.52);
      [0.85, 1.2, 1.55].forEach((w, i) => {
        this.noise(0.07, 170, 1, 0.3 - i * 0.06, 'lowpass', w);
        this.tone(70, 0.1, 0.12 - i * 0.02, 'sine', w);
      });
    },
    /* 단서를 집어 들 때: 종이 스치는 소리 */
    paper() {
      this.noise(0.16, 4200, 1, 0.06, 'highpass');
      this.noise(0.12, 2400, 2, 0.045, 'bandpass', 0.09);
      this.noise(0.1, 5200, 1, 0.035, 'highpass', 0.2);
    },
    /* 물건을 살펴볼 때: 낮은 손끝 소리 */
    tap() {
      this.noise(0.05, 900, 3, 0.12, 'bandpass');
      this.tone(196, 0.25, 0.035, 'sine', 0.01);
    },
    // 출발 레버를 당기는 소리
    leverPull() {
      this.noise(1.1, 450, 4, 0.16, 'bandpass');
      this.tone(52, 1.1, 0.14, 'sawtooth', 0, 0.1);
      this.noise(1, 2400, 3, 0.04, 'bandpass', 0.05);
    },
    // 레버가 걸리며 증기가 빠지는 소리
    clunk() {
      this.noise(0.16, 140, 1, 0.9, 'lowpass');
      this.tone(44, 0.5, 0.55, 'sine');
      this.noise(0.12, 1800, 6, 0.14, 'bandpass', 0.01);
      this.noise(1.6, 3200, 0.8, 0.06, 'highpass', 0.15);
    },
    /* 잔잔한 빗소리 (필터를 거친 잡음) */
    rain(on, fade, vol) {
      if (!this.c) return;
      const t = this.c.currentTime,
        f = fade || 1.5;
      if (on && !this.rn) {
        const g = this.c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol == null ? 0.55 : vol, t + f);
        g.connect(this.m);
        const mk = (fr, q, type, v) => {
          const s = this.c.createBufferSource();
          s.buffer = this.nb;
          s.loop = true;
          const fl = this.c.createBiquadFilter();
          fl.type = type;
          fl.frequency.value = fr;
          fl.Q.value = q;
          const gg = this.c.createGain();
          gg.gain.value = v;
          s.connect(fl);
          fl.connect(gg);
          gg.connect(g);
          s.start(0, Math.random() * 1.5);
          return s;
        };
        this.rn = {
          g,
          s: [
            mk(5200, 0.4, 'highpass', 0.025),
            mk(1700, 0.7, 'bandpass', 0.035),
            mk(420, 0.6, 'lowpass', 0.04),
          ],
        };
      } else if (!on && this.rn) {
        const r = this.rn;
        this.rn = null;
        r.g.gain.cancelScheduledValues(t);
        r.g.gain.setValueAtTime(Math.max(r.g.gain.value, 0.0001), t);
        r.g.gain.linearRampToValueAtTime(0.0001, t + f);
        r.s.forEach((x) => {
          try {
            x.stop(t + f + 0.1);
          } catch (e) {}
        });
      }
    },
    /* 엔딩 음악: 느린 3박자 피아노 (직접 합성한 사티풍 소품) */
    piece() {
      if (!this.c) return;
      this.stopPiece(0);
      const c = this.c,
        t0 = c.currentTime + 0.4,
        beat = 0.95,
        bar = beat * 3,
        mg = c.createGain();
      mg.gain.value = 1;
      const len = Math.floor(c.sampleRate * 2.6),
        ib = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ib.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
      const cv = c.createConvolver();
      cv.buffer = ib;
      const wet = c.createGain();
      wet.gain.value = 0.35;
      mg.connect(this.m);
      mg.connect(cv);
      cv.connect(wet);
      wet.connect(this.m);
      this.mg = mg;
      const pn = (f, w, d, v) => {
        [
          [1, 1, 1],
          [2, 0.28, 0.55],
          [3, 0.1, 0.3],
          [4, 0.04, 0.2],
        ].forEach((p) => {
          const o = c.createOscillator(),
            g = c.createGain(),
            t = t0 + w,
            e = d * p[2] + 0.05;
          o.type = 'sine';
          o.frequency.value = f * p[0];
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(v * p[1], t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + e);
          o.connect(g);
          g.connect(mg);
          o.start(t);
          o.stop(t + e + 0.05);
        });
      };
      const G = { b: 98, ch: [246.94, 293.66, 369.99] },
        D = { b: 73.42, ch: [220, 293.66, 369.99] };
      const M = [
        [
          [739.99, 0, 2],
          [659.25, 2, 1],
        ],
        [
          [587.33, 0, 2],
          [739.99, 2, 1],
        ],
        [
          [880, 0, 2],
          [783.99, 2, 1],
        ],
        [[739.99, 0, 3]],
        [
          [659.25, 0, 2],
          [587.33, 2, 1],
        ],
        [
          [554.37, 0, 2],
          [587.33, 2, 1],
        ],
        [
          [493.88, 0, 2],
          [440, 2, 1],
        ],
        [[587.33, 0, 3]],
      ];
      const total = 2 + 8 + 8;
      for (let i = 0; i < total; i++) {
        const k = i % 2 === 0 ? G : D,
          w = i * bar;
        pn(k.b, w, 3.2, 0.17);
        k.ch.forEach((f) => {
          pn(f, w + beat, 2, 0.05);
          pn(f, w + beat * 2, 2, 0.045);
        });
        if (i >= 2) {
          const m = M[(i - 2) % 8];
          m.forEach((n) => pn(n[0], w + n[1] * beat, n[2] * beat + 1.6, 0.11));
        }
      }
      const w = total * bar;
      pn(73.42, w, 9, 0.17);
      [293.66, 369.99, 440, 587.33].forEach((f, i) => pn(f, w + i * 0.12, 9, 0.07));
      mg.gain.setValueAtTime(1, t0 + w + 5);
      mg.gain.linearRampToValueAtTime(0.0001, t0 + w + 9.5);
    },
    // 엔딩 음악 서서히 멈추기
    stopPiece(f) {
      const g = this.mg;
      if (!g || !this.c) return;
      this.mg = null;
      const t = this.c.currentTime,
        fd = f == null ? 1 : f;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0.0001, t + fd);
      } catch (e) {}
      setTimeout(
        () => {
          try {
            g.disconnect();
          } catch (e) {}
        },
        fd * 1000 + 200,
      );
    },
    /* 인트로 음악: 탑승하는 순간부터 흐르는 느린 3박자 피아노 (8마디 반복) */
    theme() {
      if (!this.c) return;
      this.stopTheme(0);
      const c = this.c,
        beat = 0.9,
        bar = beat * 3,
        g = c.createGain(),
        now = c.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.9, now + 2);
      const len = Math.floor(c.sampleRate * 2.6),
        ib = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ib.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
      const cv = c.createConvolver();
      cv.buffer = ib;
      const wet = c.createGain();
      wet.gain.value = 0.4;
      g.connect(this.m);
      g.connect(cv);
      cv.connect(wet);
      wet.connect(this.m);
      this.tg = g;
      this.tw = wet;
      const pn = (f, t, d, v) => {
        [
          [1, 1, 1],
          [2, 0.28, 0.55],
          [3, 0.1, 0.3],
          [4, 0.04, 0.2],
        ].forEach((p) => {
          const o = c.createOscillator(),
            gg = c.createGain(),
            e = d * p[2] + 0.05;
          o.type = 'sine';
          o.frequency.value = f * p[0];
          gg.gain.setValueAtTime(0.0001, t);
          gg.gain.linearRampToValueAtTime(v * p[1], t + 0.012);
          gg.gain.exponentialRampToValueAtTime(0.0001, t + e);
          o.connect(gg);
          gg.connect(g);
          o.start(t);
          o.stop(t + e + 0.05);
        });
      };
      const Bm = { b: 123.47, ch: [246.94, 293.66, 369.99] },
        G = { b: 98, ch: [246.94, 293.66, 392] },
        D = { b: 146.83, ch: [220, 293.66, 369.99] },
        Am = { b: 110, ch: [220, 277.18, 329.63] };
      const CH = [Bm, G, D, Am, Bm, G, D, Am];
      const M = [
        [
          [739.99, 0, 2],
          [587.33, 2, 1],
        ],
        [[493.88, 0, 3]],
        [
          [440, 0, 1],
          [587.33, 1, 1],
          [739.99, 2, 1],
        ],
        [[659.25, 0, 3]],
        [
          [739.99, 0, 2],
          [987.77, 2, 1],
        ],
        [
          [880, 0, 2],
          [783.99, 2, 1],
        ],
        [
          [739.99, 0, 2],
          [587.33, 2, 1],
        ],
        [
          [659.25, 0, 2],
          [554.37, 2, 1],
        ],
      ];
      let next = now + 0.25;
      const sched = () => {
        if (this.tg !== g) return;
        for (let i = 0; i < 8; i++) {
          const k = CH[i],
            w = next + i * bar;
          pn(k.b, w, 3.2, 0.15);
          k.ch.forEach((f) => {
            pn(f, w + beat, 2, 0.045);
            pn(f, w + beat * 2, 2, 0.04);
          });
          M[i].forEach((n) => pn(n[0], w + n[1] * beat, n[2] * beat + 1.6, 0.1));
        }
        next += 8 * bar;
        this.tt = setTimeout(sched, Math.max(0, (next - c.currentTime - 1.5) * 1000));
      };
      sched();
    },
    // 인트로 음악 서서히 멈추기
    stopTheme(f) {
      const g = this.tg,
        w = this.tw;
      if (!g || !this.c) return;
      this.tg = this.tw = null;
      clearTimeout(this.tt);
      const t = this.c.currentTime,
        fd = f == null ? 1 : f;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.linearRampToValueAtTime(0.0001, t + fd);
      } catch (e) {}
      setTimeout(
        () => {
          try {
            g.disconnect();
            w.disconnect();
          } catch (e) {}
        },
        fd * 1000 + 200,
      );
    },
    // 정답 효과음
    ok() {
      [659, 784, 1047].forEach((f, i) => this.tone(f, 0.9, 0.14, 'triangle', i * 0.11));
    },
    // 오답 효과음
    bad() {
      this.tone(110, 0.28, 0.2, 'sawtooth');
      this.tone(104, 0.28, 0.18, 'sawtooth');
    },
    // 물건 획득 효과음
    get() {
      [880, 1175, 1568].forEach((f, i) => this.tone(f, 1.1, 0.09, 'sine', i * 0.07));
    },
    /* 시계 부품 화음: 태엽 레 · 톱니바퀴 파# · 바늘 라 · 유리 레-파#-라 */
    chime(fs, w, dur) {
      fs.forEach((f, i) => {
        const t = (w || 0) + i * 0.05;
        this.tone(f, dur || 2.6, 0.13, 'sine', t, 0.01);
        this.tone(f * 2, (dur || 2.6) * 0.55, 0.04, 'sine', t);
        this.tone(f * 3, (dur || 2.6) * 0.3, 0.015, 'sine', t);
      });
    },
    // 시계 부품마다 정해진 음 재생
    part(id) {
      ({
        spring: () => this.chime([293.66]),
        gear: () => this.chime([369.99]),
        hand: () => this.chime([440]),
        glass: () => this.chime([146.83, 293.66, 369.99, 440, 587.33], 0, 4.2),
      })[id]();
    },
    // 오르골 음 하나 재생
    note(f, w) {
      this.tone(f, 1.4, 0.16, 'triangle', w || 0);
      this.tone(f * 2, 0.9, 0.05, 'sine', w || 0);
    },
    // 자정 종소리
    bell(w) {
      [220, 277.2, 329.6, 440, 554.4].forEach((f) =>
        this.tone(f, 4.5, 0.11, 'sine', w || 0, 0.005),
      );
    },
  };

  /* ═════════ 그림 조각 ═════════ */
  function gear(cx, cy, r, n) {
    let d = '';
    const ri = r * 0.8,
      h = r * 0.34,
      p = (rr, a) => (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832,
        w = 6.2832 / n;
      d +=
        (i ? 'L' : 'M') +
        p(ri, a) +
        'L' +
        p(r, a + w * 0.15) +
        'L' +
        p(r, a + w * 0.45) +
        'L' +
        p(ri, a + w * 0.6);
    }
    return (
      d +
      'Z M' +
      (cx + h) +
      ' ' +
      cy +
      'a' +
      h +
      ' ' +
      h +
      ' 0 1 0 ' +
      -2 * h +
      ' 0a' +
      h +
      ' ' +
      h +
      ' 0 1 0 ' +
      2 * h +
      ' 0Z'
    );
  }
  // 태엽(나선) 모양의 SVG 경로 만들기
  function spiral(cx, cy, r0, r1, turns) {
    let d = '';
    const N = turns * 28;
    for (let i = 0; i <= N; i++) {
      const a = (i / 28) * 6.2832,
        r = r0 + ((r1 - r0) * i) / N;
      d +=
        (i ? 'L' : 'M') +
        (cx + r * Math.cos(a)).toFixed(1) +
        ' ' +
        (cy + r * Math.sin(a)).toFixed(1);
    }
    return d;
  }
  let uid = 0;
  // 회중시계 그림 (부품 유무와 바늘 각도 지정)
  function watchSVG(o) {
    o = Object.assign({ spring: 1, gear: 1, hand: 1, glass: 1, h: 359.5, m: 354, s: 0 }, o || {});
    const u = 'w' + uid++;
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    let nums = '';
    R.forEach((r, i) => {
      const a = ((i * 30 - 90) * Math.PI) / 180;
      nums +=
        '<text x="' +
        (76 * Math.cos(a)).toFixed(1) +
        '" y="' +
        (76 * Math.sin(a) + 4).toFixed(1) +
        '" text-anchor="middle" font-size="11" font-family="Nanum Myeongjo,serif" font-weight="800" fill="#2a1c12">' +
        r +
        '</text>';
    });
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180;
      ticks +=
        '<line x1="' +
        (88 * Math.cos(a)).toFixed(1) +
        '" y1="' +
        (88 * Math.sin(a)).toFixed(1) +
        '" x2="' +
        ((i % 5 ? 85 : 83) * Math.cos(a)).toFixed(1) +
        '" y2="' +
        ((i % 5 ? 85 : 83) * Math.sin(a)).toFixed(1) +
        '" stroke="#2a1c12" stroke-width="' +
        (i % 5 ? 0.6 : 1.4) +
        '"/>';
    }
    return (
      '<svg viewBox="-125 -160 250 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="회중시계">' +
      '<defs><radialGradient id="' +
      u +
      'b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f7e2a4"/><stop offset=".45" stop-color="#c79a4b"/><stop offset="1" stop-color="#6e4a1c"/></radialGradient>' +
      '<radialGradient id="' +
      u +
      'd" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#241710"/><stop offset="1" stop-color="#0e0906"/></radialGradient></defs>' +
      '<circle cx="0" cy="-128" r="17" fill="none" stroke="url(#' +
      u +
      'b)" stroke-width="6"/><rect x="-9" y="-116" width="18" height="16" rx="3" fill="url(#' +
      u +
      'b)"/>' +
      '<circle r="104" fill="url(#' +
      u +
      'b)"/><circle r="94" fill="#3a2610"/><circle r="91" fill="#efe2c4"/>' +
      ticks +
      nums +
      '<circle r="62" fill="url(#' +
      u +
      'd)" stroke="#c79a4b" stroke-width="2"/>' +
      (o.spring
        ? '<g data-p="spring"><circle cx="-18" cy="18" r="27" fill="#1a110a" stroke="#8a6223" stroke-width="1.5"/><path d="' +
          spiral(-18, 18, 3, 24, 5) +
          '" fill="none" stroke="#e9c46a" stroke-width="2"/></g>'
        : '<circle cx="-18" cy="18" r="27" fill="none" stroke="#6e4a1c" stroke-width="1" stroke-dasharray="3 4"/>') +
      (o.gear
        ? '<g data-p="gear" fill-rule="evenodd"><path class="g1" d="' +
          gear(24, -18, 24, 14) +
          '" fill="#c79a4b" stroke="#6e4a1c"/><path class="g2" d="' +
          gear(30, 30, 15, 10) +
          '" fill="#d9b566" stroke="#6e4a1c"/><path class="g3" d="' +
          gear(-26, -30, 13, 9) +
          '" fill="#b08238" stroke="#6e4a1c"/></g>'
        : '<circle cx="24" cy="-18" r="24" fill="none" stroke="#6e4a1c" stroke-width="1" stroke-dasharray="3 4"/><circle cx="30" cy="30" r="15" fill="none" stroke="#6e4a1c" stroke-dasharray="3 4"/>') +
      (o.hand
        ? '<g data-p="hand"><g class="hh" transform="rotate(' +
          o.h +
          ')"><path d="M-3 8L0 -46L3 8Z" fill="#1a110a" stroke="#f0cf7e" stroke-width=".8"/></g><g class="mh" transform="rotate(' +
          o.m +
          ')"><path d="M-2.2 10L0 -72L2.2 10Z" fill="#1a110a" stroke="#f0cf7e" stroke-width=".8"/></g><g class="sh" transform="rotate(' +
          o.s +
          ')"><line y1="16" y2="-80" stroke="#b3261e" stroke-width="1.3"/></g><circle r="5" fill="#f0cf7e" stroke="#6e4a1c"/></g>'
        : '<circle r="5" fill="none" stroke="#6e4a1c" stroke-dasharray="2 3"/>') +
      (o.glass
        ? '<g data-p="glass"><circle r="92" fill="#cfe6ff" opacity=".07"/><path d="M-70 -40A82 82 0 0 1 10 -80" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".28"/></g>'
        : '') +
      '<g class="crack" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="bevel"><path d="M-6 -4L-30 -38L-22 -62L-48 -78"/><path d="M-6 -4L28 -22L44 -10L78 -34"/><path d="M-6 -4L8 34L-8 58L6 88"/><path d="M-6 -4L-44 12L-58 4L-88 22"/><path d="M28 -22L36 -52"/><path d="M8 34L40 48"/></g>' +
      '</svg>'
    );
  }
  // 작은 우산 아이콘 그림
  function umb(c) {
    return (
      '<path d="M4 20A16 16 0 0 1 36 20Q32 16 28 20Q24 16 20 20Q16 16 12 20Q8 16 4 20Z" fill="' +
      c +
      '"/><path d="M20 20V33q0 4 -4 4" fill="none" stroke="#3b2115" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="4" x2="20" y2="1.5" stroke="#3b2115" stroke-width="2"/>'
    );
  }
  // 소지품 아이콘 모음
  const IC = {
    case: '<svg viewBox="0 0 40 40"><circle cx="20" cy="7" r="4" fill="none" stroke="#c79a4b" stroke-width="2"/><circle cx="20" cy="23" r="14" fill="#c79a4b"/><circle cx="20" cy="23" r="10.5" fill="#120c09" stroke="#6e4a1c" stroke-dasharray="2 2"/></svg>',
    spring:
      '<svg viewBox="0 0 40 40"><path d="' +
      spiral(20, 20, 2, 15, 4) +
      '" fill="none" stroke="#e9c46a" stroke-width="2.4"/></svg>',
    gear:
      '<svg viewBox="0 0 40 40"><path fill-rule="evenodd" d="' +
      gear(20, 20, 16, 10) +
      '" fill="#c79a4b" stroke="#6e4a1c"/></svg>',
    hand: '<svg viewBox="0 0 40 40"><path d="M18 30L20 4L22 30Z" fill="#f0cf7e" stroke="#6e4a1c"/><path d="M12 31L30 14L15 34Z" fill="#f0cf7e" stroke="#6e4a1c"/><circle cx="19" cy="30" r="3" fill="#6e4a1c"/></svg>',
    glass:
      '<svg viewBox="0 0 40 40"><path d="M6 12L26 4L36 22L20 36L9 28Z" fill="#cfe6ff" fill-opacity=".45" stroke="#eaf5ff" stroke-width="1.5"/><path d="M12 14L24 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    diary:
      '<svg viewBox="0 0 40 40"><rect x="7" y="5" width="26" height="30" rx="2" fill="#5a3320"/><rect x="10" y="5" width="3" height="30" fill="#3b2115"/><rect x="17" y="12" width="12" height="2" fill="#c79a4b"/><rect x="17" y="17" width="9" height="2" fill="#c79a4b"/></svg>',
    photo:
      '<svg viewBox="0 0 40 40"><rect x="6" y="4" width="28" height="33" fill="#f4eedd" stroke="#6e4a1c"/><rect x="9" y="7" width="22" height="22" fill="#33415e"/><g transform="translate(11 8) scale(.45)">' +
      umb('#f2c230') +
      '</g></svg>',
    letter:
      '<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="23" fill="#f4eedd" stroke="#6e4a1c"/><path d="M4 9L20 22L36 9" fill="none" stroke="#6e4a1c"/><circle cx="20" cy="23" r="4" fill="#8b1c1c"/><g transform="translate(25 22) scale(.24)">' +
      umb('#f2c230') +
      '</g></svg>',
  };

  // 윤정의 사진 — 긴 생머리, 노란 우산을 어깨에 걸친 모습
  function photoArt() {
    return (
      '<svg viewBox="0 0 240 240" role="img" aria-label="노란 우산을 든 윤정의 사진">' +
      '<defs>' +
      '<linearGradient id="yjBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3b58"/><stop offset="1" stop-color="#3b4763"/></linearGradient>' +
      '<linearGradient id="yjSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdeee2"/><stop offset="1" stop-color="#f6d9c8"/></linearGradient>' +
      '<linearGradient id="yjHair" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1211"/><stop offset=".5" stop-color="#2c201c"/><stop offset="1" stop-color="#171010"/></linearGradient>' +
      '<linearGradient id="yjKnit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a82d2"/><stop offset="1" stop-color="#2d5fa8"/></linearGradient>' +
      '<radialGradient id="yjUmb" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffe27a"/><stop offset=".7" stop-color="#f2c230"/><stop offset="1" stop-color="#d9a51e"/></radialGradient>' +
      '<radialGradient id="yjGlow"><stop offset="0" stop-color="#ffe6a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      // 배경: 비 오는 새벽역 승강장
      '<rect width="240" height="240" fill="url(#yjBg)"/>' +
      '<rect y="188" width="240" height="52" fill="#4a453f"/>' +
      '<rect y="185" width="240" height="4" fill="#d8c59c" opacity=".45"/>' +
      '<rect x="6" y="150" width="50" height="20" rx="2" fill="#1d2a3f" stroke="#d8c59c" stroke-width="1" opacity=".9"/>' +
      '<text x="31" y="164" text-anchor="middle" font-size="10" fill="#f0e2bd" font-family="Nanum Myeongjo,serif">새벽역</text>' +
      '<rect x="29" y="170" width="4" height="18" fill="#1d2a3f"/>' +
      '<rect x="213" y="96" width="3" height="92" fill="#1a2233"/>' +
      '<circle cx="214" cy="92" r="26" fill="url(#yjGlow)"/>' +
      '<circle cx="214" cy="92" r="5" fill="#fff0c2"/>' +
      // 어깨에 걸친 노란 우산 (머리 뒤로 둥글게 펼쳐진다)
      '<path d="M120 4Q150 2 174 20Q196 36 200 62Q204 88 190 112Q176 138 150 150Q120 162 90 150Q64 138 50 112Q36 88 40 62Q44 36 66 20Q90 2 120 4Z" fill="url(#yjUmb)"/>' +
      '<g stroke="#b88a14" stroke-width="1" opacity=".55">' +
      '<line x1="120" y1="82" x2="120" y2="4"/><line x1="120" y1="82" x2="174" y2="20"/><line x1="120" y1="82" x2="200" y2="62"/><line x1="120" y1="82" x2="190" y2="112"/>' +
      '<line x1="120" y1="82" x2="66" y2="20"/><line x1="120" y1="82" x2="40" y2="62"/><line x1="120" y1="82" x2="50" y2="112"/>' +
      '</g>' +
      '<path d="M66 20Q90 2 120 4Q150 2 174 20" fill="none" stroke="#fff3b8" stroke-width="3" stroke-linecap="round" opacity=".5"/>' +
      // 뒤로 흘러내리는 긴 머리
      '<path d="M86 92Q84 48 120 47Q156 48 154 92L160 204Q120 212 80 204Z" fill="url(#yjHair)"/>' +
      // 상체: 파란 코트
      '<path d="M68 240Q68 160 100 143L120 150L140 143Q172 160 172 240Z" fill="url(#yjKnit)"/>' +
      '<path d="M106 140L120 168L134 140L128 136H112Z" fill="#24487f"/>' +
      '<path d="M104 142L120 174L136 142" fill="none" stroke="#1f4684" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M120 174V240" stroke="#1f4684" stroke-width="1.6"/>' +
      '<circle cx="120" cy="212" r="2.6" fill="#c9b78f"/><circle cx="120" cy="230" r="2.6" fill="#c9b78f"/>' +
      // 우산대와 두 손
      '<line x1="150" y1="140" x2="131" y2="196" stroke="#4a2f1c" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M131 196q-3 9 -10 6" fill="none" stroke="#4a2f1c" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M70 214Q92 180 126 182L130 196Q104 198 84 232Z" fill="url(#yjKnit)" stroke="#1f4684" stroke-width="1"/>' +
      '<path d="M170 214Q160 186 140 180L134 194Q148 200 156 232Z" fill="url(#yjKnit)" stroke="#1f4684" stroke-width="1"/>' +
      // 초록색 기차표
      '<g transform="rotate(-10 112 188)"><rect x="96" y="179" width="32" height="18" rx="2" fill="#3f9a56" stroke="#2a6e3c" stroke-width="1"/><path d="M100 184h14M100 188h20M100 192h10" stroke="#e6f4e4" stroke-width="1.1" opacity=".85"/></g>' +
      '<ellipse cx="129" cy="187" rx="9" ry="6.5" fill="url(#yjSkin)" stroke="#e2bca9" stroke-width=".8"/>' +
      '<ellipse cx="136" cy="181" rx="8.5" ry="6" fill="url(#yjSkin)" stroke="#e2bca9" stroke-width=".8"/>' +
      // 목
      '<path d="M111 108H129V140Q120 150 111 140Z" fill="#ecc9b8"/>' +
      '<path d="M111 118Q120 128 129 118V112H111Z" fill="#d9ad9a" opacity=".55"/>' +
      // 빨간 목도리
      '<path d="M108 140L105 160L119 162L121 142Z" fill="#b3261e"/><path d="M106 158l-1 7M110 159l-1 7M114 160l-1 7M118 160v7" stroke="#b3261e" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M98 125Q120 112 142 125Q145 136 139 143Q120 151 101 143Q95 136 98 125Z" fill="#c62f2b"/>' +
      '<path d="M100 131Q120 120 140 131M101 138Q120 129 139 138" fill="none" stroke="#9c1f1b" stroke-width="1.2" opacity=".7"/>' +
      // 얼굴: 갸름한 턱선
      '<path d="M98 86Q98 62 120 62Q142 62 142 86Q142 104 132 114Q120 123 108 114Q98 104 98 86Z" fill="url(#yjSkin)"/>' +
      // 어깨 앞으로 내려오는 옆머리
      '<path d="M106 61Q92 74 90 100Q88 150 84 200Q92 213 100 204Q105 160 102 124Q99 102 100 90Q101 75 110 63Z" fill="url(#yjHair)"/>' +
      '<path d="M134 61Q148 74 150 100Q152 150 156 200Q148 213 140 204Q135 160 138 124Q141 102 140 90Q139 75 130 63Z" fill="url(#yjHair)"/>' +
      // 가운데 가르마와 정수리
      '<path d="M94 92Q87 48 120 47Q153 48 146 92Q144 72 122 60Q120 59 118 60Q96 72 94 92Z" fill="url(#yjHair)"/>' +
      '<path d="M120 48V59" stroke="#3a2c27" stroke-width=".8"/>' +
      // 머릿결 윤기
      '<g fill="none" stroke="#fff" stroke-linecap="round" opacity=".13">' +
      '<path d="M100 62Q110 54 120 53" stroke-width="2.5"/><path d="M91 110Q90 150 86 190" stroke-width="2"/><path d="M149 110Q150 150 154 190" stroke-width="2"/>' +
      '</g>' +
      // 눈썹
      '<path d="M104.5 85.5Q110 83.2 116 85" fill="none" stroke="#6b4f45" stroke-width="1.1" opacity=".85" stroke-linecap="round"/>' +
      '<path d="M124 85Q130 83.2 135.5 85.5" fill="none" stroke="#6b4f45" stroke-width="1.1" opacity=".85" stroke-linecap="round"/>' +
      // 눈: 크고 또렷하게
      '<path d="M104 93Q110.5 87 117 93Q110.5 96.5 104 93Z" fill="#fff"/>' +
      '<path d="M123 93Q129.5 87 136 93Q129.5 96.5 123 93Z" fill="#fff"/>' +
      '<circle cx="110.5" cy="92.3" r="2.8" fill="#3a2620"/><circle cx="129.5" cy="92.3" r="2.8" fill="#3a2620"/>' +
      '<circle cx="111.6" cy="91.1" r=".95" fill="#fff"/><circle cx="130.6" cy="91.1" r=".95" fill="#fff"/>' +
      '<path d="M103.3 93.2Q110.5 86.2 117.6 92.6" fill="none" stroke="#2a1c18" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M122.4 92.6Q129.5 86.2 136.7 93.2" fill="none" stroke="#2a1c18" stroke-width="1.2" stroke-linecap="round"/>' +
      // 코
      '<path d="M120.5 96Q122 102 120 104.5Q119 105 118 104.6" fill="none" stroke="#d9a996" stroke-width="1" stroke-linecap="round"/>' +
      // 입: 옅은 미소
      '<path d="M113.5 110Q117 108.2 120 109.2Q123 108.2 126.5 110Q120 114.5 113.5 110Z" fill="#d9818a"/>' +
      '<path d="M113 110Q120 112.6 127 110" fill="none" stroke="#b9606b" stroke-width=".9" stroke-linecap="round"/>' +
      // 볼터치
      '<ellipse cx="106" cy="102" rx="6" ry="3.4" fill="#f5a9a6" opacity=".38"/>' +
      '<ellipse cx="134" cy="102" rx="6" ry="3.4" fill="#f5a9a6" opacity=".38"/>' +
      // 사진 위 빗자국
      '<g stroke="#c7d9f5" stroke-width="1" opacity=".45">' +
      '<line x1="22" y1="20" x2="18" y2="34"/><line x1="222" y1="24" x2="218" y2="39"/><line x1="16" y1="96" x2="12" y2="111"/>' +
      '<line x1="228" y1="141" x2="224" y2="156"/><line x1="34" y1="126" x2="30" y2="141"/><line x1="204" y1="170" x2="200" y2="184"/>' +
      '</g>' +
      '</svg>'
    );
  }

  /* ═════════ 캔버스 연출 ═════════ */
  const cv = $('#fx'),
    cx = cv.getContext('2d');
  let W = 0,
    H = 0;
  // 창 크기에 맞춰 캔버스 크기 조정
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * d;
    cv.height = H * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  // 캔버스 연출의 현재 상태
  const FX = {
    mode: 'title',
    t0: performance.now(),
    zoom: 1,
    zoomTo: 1,
    flash: 0,
    shards: [],
    frozen: false,
    done: null,
  };
  // 캔버스 연출 장면 바꾸기
  function setMode(m) {
    FX.mode = m;
    FX.t0 = performance.now();
    FX.zoom = FX.zoomTo = 1;
  }
  // 배경 산등성이 높이값 (고정 난수)
  const hills = (() => {
    const r = mul(7),
      a = [];
    for (let L = 0; L < 3; L++) {
      const p = [];
      for (let i = 0; i <= 40; i++) p.push(r());
      a.push(p);
    }
    return a;
  })();
  // 배경 별 위치 (고정 난수)
  const starsBg = (() => {
    const r = mul(21),
      a = [];
    for (let i = 0; i < 160; i++) a.push([r(), r() * 0.6, r() * 1.3 + 0.3, r()]);
    return a;
  })();
  // 빗방울 위치 (고정 난수)
  const drops = (() => {
    const r = mul(99),
      a = [];
    for (let i = 0; i < 220; i++) a.push([r(), r(), r() * 0.6 + 0.4]);
    return a;
  })();

  // 기관차와 객차 네 칸 그리기
  function drawTrain(c, fx, y, h, t, moving) {
    // 왼쪽이 진행 방향: 기관차 → 1호차 … 4호차
    const lw = h * 3.9;
    let x = fx;
    // 전조등
    const g = c.createLinearGradient(x - h * 7, 0, x, 0);
    g.addColorStop(0, 'rgba(255,230,170,0)');
    g.addColorStop(1, 'rgba(255,230,170,.32)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y - h * 0.55);
    c.lineTo(x - h * 7, y - h * 1.5);
    c.lineTo(x - h * 7, y + h * 0.2);
    c.closePath();
    c.fill();
    // 증기
    const chx = x + h * 0.55,
      chy = y - h * 1.05;
    for (let i = 0; i < 16; i++) {
      const age = ((moving ? t * 0.35 : 0) + i / 16) % 1;
      const px = chx + age * h * (moving ? 9 : 1.2) + Math.sin(i * 3.1) * h * 0.2,
        py = chy - age * h * (moving ? 2.4 : 3.2) - h * 0.1;
      c.fillStyle = 'rgba(190,200,220,' + ((1 - age) * 0.22).toFixed(3) + ')';
      c.beginPath();
      c.arc(px, py, h * (0.22 + age * 1.1), 0, 7);
      c.fill();
    }
    // 기관차
    c.fillStyle = '#0c0b0d';
    c.fillRect(x, y - h * 0.72, h * 2.5, h * 0.56);
    c.beginPath();
    c.arc(x + h * 0.05, y - h * 0.44, h * 0.28, 0, 7);
    c.fill();
    c.fillRect(x + h * 0.42, y - h * 1.05, h * 0.24, h * 0.36);
    c.fillRect(x + h * 1.3, y - h * 0.86, h * 0.36, h * 0.2);
    c.fillStyle = '#3a1012';
    c.fillRect(x + h * 2.5, y - h * 0.98, h * 1.1, h * 0.82);
    c.fillStyle = '#0c0b0d';
    c.fillRect(x + h * 2.44, y - h * 1.04, h * 1.22, h * 0.1);
    c.fillStyle = '#ffcf7a';
    c.fillRect(x + h * 2.72, y - h * 0.84, h * 0.4, h * 0.3);
    c.fillStyle = '#fff1c4';
    c.beginPath();
    c.arc(x - h * 0.06, y - h * 0.6, h * 0.09, 0, 7);
    c.fill();
    c.fillStyle = '#0c0b0d';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(x + h * (0.5 + i * 0.75), y - h * 0.02, h * (i < 3 ? 0.24 : 0.16), 0, 7);
      c.fill();
    }
    c.fillRect(x - h * 0.1, y - h * 0.18, lw, h * 0.1);
    x += lw + h * 0.12;
    for (let k = 0; k < 4; k++) {
      const L = h * 5.1;
      c.fillStyle = '#16090a';
      c.fillRect(x, y - h * 0.2, L, h * 0.2);
      c.fillStyle = '#5e1a1c';
      c.fillRect(x, y - h * 0.95, L, h * 0.78);
      c.fillStyle = '#1a1215';
      c.beginPath();
      c.moveTo(x - h * 0.04, y - h * 0.95);
      c.quadraticCurveTo(x + L / 2, y - h * 1.16, x + L + h * 0.04, y - h * 0.95);
      c.closePath();
      c.fill();
      c.fillStyle = '#d8b56a';
      c.fillRect(x, y - h * 0.42, L, h * 0.03);
      c.save();
      c.shadowColor = 'rgba(255,200,110,.9)';
      c.shadowBlur = h * 0.5;
      c.fillStyle = '#ffd98a';
      for (let i = 0; i < 9; i++)
        c.fillRect(x + h * (0.3 + i * 0.52), y - h * 0.82, h * 0.34, h * 0.32);
      c.restore();
      c.fillStyle = '#0c0b0d';
      [0.5, 1.1, 4, 4.6].forEach((q) => {
        c.beginPath();
        c.arc(x + h * q, y - h * 0.02, h * 0.13, 0, 7);
        c.fill();
      });
      x += L + h * 0.14;
    }
    return x - fx;
  }
  // 밤 풍경(하늘·달·산·다리·기차·비) 그리기
  function drawLand(t, o) {
    const c = cx;
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#04060d');
    sky.addColorStop(0.55, o.dawn ? '#1c2444' : '#101830');
    sky.addColorStop(1, o.dawn ? '#4a3a4e' : '#1d2740');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    c.save();
    if (FX.zoom !== 1) {
      const px = W * 0.46,
        py = H * (o.low || 0.66);
      c.translate(px, py);
      c.scale(FX.zoom, FX.zoom);
      c.translate(-px, -py);
    }
    if (o.stars) {
      for (const s of starsBg) {
        const x = ((s[0] + t * 0.004 * o.stars) % 1) * W,
          tw = 0.5 + 0.5 * Math.sin(t * 1.3 + s[3] * 40);
        c.fillStyle = 'rgba(235,240,255,' + (0.35 + 0.6 * tw * s[3]).toFixed(2) + ')';
        c.beginPath();
        c.arc(x, s[1] * H, s[2], 0, 7);
        c.fill();
      }
    }
    // 달무리
    const mx = W * 0.8,
      my = H * 0.2,
      mg = c.createRadialGradient(mx, my, 0, mx, my, H * 0.42);
    mg.addColorStop(0, 'rgba(210,225,255,.5)');
    mg.addColorStop(0.08, 'rgba(190,210,250,.22)');
    mg.addColorStop(1, 'rgba(160,190,240,0)');
    c.fillStyle = mg;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(236,242,255,.9)';
    c.beginPath();
    c.arc(mx, my, H * 0.035, 0, 7);
    c.fill();
    // 고가교와 기차 (dy = 다리 윗면 높이)
    const bridge = (dy) => {
      // 고가교
      const ph = H * 0.26;
      c.fillStyle = '#06080f';
      c.fillRect(0, dy, W, H * 0.022);
      const n = Math.max(6, Math.round(W / 170)),
        sp = W / n;
      for (let i = 0; i <= n; i++) {
        c.fillRect(i * sp - sp * 0.09, dy, sp * 0.18, ph);
      }
      c.beginPath();
      for (let i = 0; i < n; i++) {
        c.moveTo(i * sp + sp * 0.09, dy + sp * 0.5);
        c.lineTo(i * sp + sp * 0.09, dy + H * 0.02);
        c.lineTo(i * sp + sp * 0.91, dy + H * 0.02);
        c.lineTo(i * sp + sp * 0.91, dy + sp * 0.5);
        c.arc(i * sp + sp * 0.5, dy + sp * 0.5, sp * 0.41, 0, Math.PI, true);
      }
      c.fill('evenodd');
      c.strokeStyle = 'rgba(120,140,190,.25)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, dy);
      c.lineTo(W, dy);
      c.stroke();
      const h = Math.min(H * 0.055, W * 0.032);
      drawTrain(c, o.trainX(h), dy, h, t, o.moving);
    };
    // 산
    const cols = ['#111a30', '#0c1324', '#080d19'],
      base = [0.56, 0.64, 0.74],
      amp = [0.2, 0.16, 0.12];
    for (let L = 0; L < 3; L++) {
      c.fillStyle = cols[L];
      c.beginPath();
      c.moveTo(0, H);
      const p = hills[L];
      for (let i = 0; i <= 40; i++) {
        c.lineTo((i / 40) * W, H * (base[L] - amp[L] * p[i] * (L === 0 ? 1 : 0.8)));
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();
      if (L === 1 && !o.low) bridge(H * 0.665);
    }
    // 침엽수 실루엣
    c.fillStyle = '#04060c';
    const rr = mul(5);
    for (let i = 0; i < 14; i++) {
      const x = (i < 7 ? rr() * 0.26 : 0.74 + rr() * 0.26) * W,
        hh = H * (0.16 + rr() * 0.22),
        w = hh * 0.3;
      c.beginPath();
      c.moveTo(x, H - hh);
      c.lineTo(x + w, H);
      c.lineTo(x - w, H);
      c.closePath();
      c.fill();
    }
    if (o.low) bridge(H * o.low); // 엔딩: 기차를 화면 아래쪽으로
    c.restore();
    if (o.rain) {
      c.strokeStyle = 'rgba(180,200,240,.34)';
      c.lineWidth = 1;
      c.beginPath();
      for (const d of drops) {
        const sp = o.rain === 2 ? 0 : (0.9 + d[2]) * 1.1;
        const y = ((d[1] + t * sp) % 1) * H,
          x = ((((d[0] - (o.rain === 2 ? 0 : t * 0.08)) % 1) + 1) % 1) * W,
          l = 10 + d[2] * 16;
        c.moveTo(x, y);
        c.lineTo(x - l * 0.18, y + l);
      }
      c.stroke();
    }
  }
  // 터널 단면(아치) 경로 그리기
  function arch(c, x, y, a) {
    const fl = y + a * 0.62,
      sp = y - a * 0.12;
    c.moveTo(x - a, fl);
    c.lineTo(x - a, sp);
    c.arc(x, sp, a, Math.PI, 0, false);
    c.lineTo(x + a, fl);
    c.closePath();
  }
  const TUN = { v: 7.2, T0: 8, T1: 36 };
  // 인트로 터널 통과 장면 그리기
  function drawTunnel(t) {
    const c = cx,
      p = t * TUN.v,
      R = Math.hypot(W, H) * 0.62;
    const bump = Math.pow(Math.max(0, Math.sin(t * 9.8)), 18) * 4;
    const X = W / 2 + Math.sin(t * 31) * 1.6 + Math.sin(t * 17) * 1.2,
      Y = H * 0.5 + Math.sin(t * 23) * 1.3 + bump;
    c.fillStyle = '#020203';
    c.fillRect(0, 0, W, H);
    const zEnd = TUN.T1 - p,
      zIn = TUN.T0 - p;
    // 터널 끝의 바깥 빛
    if (zEnd < 40) {
      const a = R / Math.max(zEnd, 0.05),
        g = c.createRadialGradient(X, Y, 0, X, Y, Math.max(a * 1.1, 2));
      g.addColorStop(0, '#eef4ff');
      g.addColorStop(0.5, '#8ea9dc');
      g.addColorStop(1, '#2a3a66');
      c.save();
      c.shadowColor = '#bcd0ff';
      c.shadowBlur = Math.min(120, a * 0.8);
      c.fillStyle = g;
      c.beginPath();
      arch(c, X, Y, a);
      c.fill();
      c.restore();
    }
    const n0 = Math.max(Math.ceil(p + 0.22), TUN.T0),
      n1 = Math.min(Math.floor(p + 44), TUN.T1);
    for (let n = n1; n >= n0; n--) {
      const z = n - p,
        a = R / z,
        zf = z + 1,
        af = n + 1 > TUN.T1 ? 0 : R / zf;
      const dl = Math.min(n % 6, 6 - (n % 6)),
        L = 0.06 + 0.95 * Math.exp(-dl * 0.95),
        fog = 1 / (1 + z * 0.09),
        k = (n % 2 ? 0.9 : 1) * fog;
      c.fillStyle =
        'rgb(' +
        Math.round((26 + 170 * L) * k) +
        ',' +
        Math.round((20 + 118 * L) * k) +
        ',' +
        Math.round((16 + 66 * L) * k) +
        ')';
      c.beginPath();
      arch(c, X, Y, a);
      if (n < TUN.T1) arch(c, X, Y, R / (z + 1));
      c.fill('evenodd');
      // 침목과 자갈
      const fy = Y + a * 0.62,
        fy2 = n < TUN.T1 ? Y + (R / (z + 1)) * 0.62 : fy;
      c.fillStyle =
        'rgb(' +
        Math.round(22 * k + 8) +
        ',' +
        Math.round(18 * k + 6) +
        ',' +
        Math.round(15 * k + 5) +
        ')';
      c.beginPath();
      c.moveTo(X - a, fy);
      c.lineTo(X + a, fy);
      c.lineTo(X + R / (z + 1), fy2);
      c.lineTo(X - R / (z + 1), fy2);
      c.closePath();
      if (n < TUN.T1) c.fill();
      c.strokeStyle = 'rgba(70,52,38,' + (fog * 0.9).toFixed(2) + ')';
      c.lineWidth = Math.max(1, a * 0.035);
      c.beginPath();
      c.moveTo(X - a * 0.42, fy);
      c.lineTo(X + a * 0.42, fy);
      c.stroke();
      if (n < TUN.T1) {
        const b = R / (z + 1),
          sA = Y - a * 0.12,
          sB = Y - b * 0.12,
          st = n % 2 ? 0.5 : 0;
        // 벽돌 줄눈: 고리마다 엇갈리게
        c.strokeStyle = 'rgba(0,0,0,' + (0.3 * fog + 0.1).toFixed(2) + ')';
        c.lineWidth = Math.max(1, a * 0.005);
        c.beginPath();
        for (let j = 0; j < 10; j++) {
          const th = (Math.PI * (j + st)) / 10;
          if (th <= 0 || th >= Math.PI) continue;
          c.moveTo(X + a * Math.cos(th), sA - a * Math.sin(th));
          c.lineTo(X + b * Math.cos(th), sB - b * Math.sin(th));
        }
        [0.08, 0.34].forEach((q) =>
          [-1, 1].forEach((sd) => {
            const qq = q + st * 0.26;
            c.moveTo(X + sd * a, Y + a * qq);
            c.lineTo(X + sd * b, Y + b * qq);
          }),
        );
        c.moveTo(X - a, fy);
        c.lineTo(X - a, sA);
        c.arc(X, sA, a, Math.PI, 0, false);
        c.lineTo(X + a, fy);
        c.stroke();
        // 아치 보강 리브 (세 칸마다)
        if (n % 3 === 0) {
          c.strokeStyle =
            'rgba(' +
            Math.round((60 + 120 * L) * k) +
            ',' +
            Math.round((48 + 84 * L) * k) +
            ',' +
            Math.round((40 + 50 * L) * k) +
            ',.9)';
          c.lineWidth = Math.max(1.5, a * 0.03);
          c.beginPath();
          c.moveTo(X - a * 0.985, fy);
          c.lineTo(X - a * 0.985, sA);
          c.arc(X, sA, a * 0.985, Math.PI, 0, false);
          c.lineTo(X + a * 0.985, fy);
          c.stroke();
        }
        // 오른쪽 벽의 전선 두 가닥과 고정쇠
        c.strokeStyle = 'rgba(6,6,9,' + (0.8 * fog + 0.15).toFixed(2) + ')';
        c.lineWidth = Math.max(1, a * 0.011);
        c.beginPath();
        [-0.06, 0.02].forEach((q) => {
          c.moveTo(X + a * 0.975, Y + a * q);
          c.lineTo(X + b * 0.975, Y + b * q);
        });
        c.stroke();
        if (n % 2 === 0) {
          c.fillStyle = 'rgba(120,100,70,' + (fog * 0.8).toFixed(2) + ')';
          c.fillRect(X + a * 0.955, Y - a * 0.075, a * 0.03, a * 0.11);
        }
        // 배수로와 자갈 가장자리
        c.fillStyle = 'rgba(0,0,0,' + (0.35 * fog + 0.1).toFixed(2) + ')';
        [-1, 1].forEach((sd) => {
          c.beginPath();
          c.moveTo(X + sd * a, fy);
          c.lineTo(X + sd * a * 0.86, fy);
          c.lineTo(X + sd * b * 0.86, fy2);
          c.lineTo(X + sd * b, fy2);
          c.closePath();
          c.fill();
        });
        // 레일: 등불 아래에서 반짝인다
        c.strokeStyle =
          'rgba(' +
          Math.round(120 + 130 * L) +
          ',' +
          Math.round(120 + 100 * L) +
          ',' +
          Math.round(130 + 50 * L) +
          ',' +
          Math.min(1, fog * (0.4 + 0.9 * L)).toFixed(2) +
          ')';
        c.lineWidth = Math.max(1.5, a * 0.014);
        c.beginPath();
        [-0.26, 0.26].forEach((sd) => {
          c.moveTo(X + sd * a, fy);
          c.lineTo(X + sd * b, fy2);
        });
        c.stroke();
        // 대피 공간 (열두 칸마다, 오른쪽 벽)
        if (n % 12 === 3) {
          c.fillStyle = 'rgba(0,0,0,.72)';
          c.beginPath();
          c.moveTo(X + a, fy);
          c.lineTo(X + a, Y + a * 0.18);
          c.lineTo(X + b, Y + b * 0.18);
          c.lineTo(X + b, fy2);
          c.closePath();
          c.fill();
        }
        // 거리 표지 (여섯 칸마다, 왼쪽 벽)
        if (n % 6 === 3) {
          c.fillStyle = 'rgba(225,225,215,' + Math.min(0.9, fog * 1.4).toFixed(2) + ')';
          c.fillRect(X - a * 0.995, Y + a * 0.2, Math.max(2, (a - b) * 0.25), a * 0.07);
        }
      }
      if (n % 6 === 0) {
        const lw = Math.max(1, a * 0.012);
        c.strokeStyle = 'rgba(20,16,12,.9)';
        c.lineWidth = lw;
        c.beginPath();
        c.moveTo(X - a * 0.96, Y - a * 0.5);
        c.lineTo(X - a * 0.8, Y - a * 0.5);
        c.stroke();
      }
      if (n % 6 === 0) {
        const lx = X - a * 0.8,
          ly = Y - a * 0.5,
          lr = a * 0.5,
          g = c.createRadialGradient(lx, ly, 0, lx, ly, lr);
        g.addColorStop(0, 'rgba(255,236,190,' + Math.min(1, fog * 1.6).toFixed(2) + ')');
        g.addColorStop(0.12, 'rgba(255,196,110,' + (fog * 0.8).toFixed(2) + ')');
        g.addColorStop(1, 'rgba(255,170,80,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(lx, ly, lr, 0, 7);
        c.fill();
        c.fillStyle = 'rgba(255,246,214,' + Math.min(1, fog * 2).toFixed(2) + ')';
        c.beginPath();
        c.arc(lx, ly, Math.max(1.5, a * 0.035), 0, 7);
        c.fill();
      }
    }
    // 레일
    c.strokeStyle = 'rgba(200,205,220,.55)';
    c.lineWidth = 2;
    [-0.26, 0.26].forEach((s) => {
      const zn = Math.max(0.3, zIn > 0 ? 0.3 : 0.3),
        a = R / zn;
      c.beginPath();
      c.moveTo(X + s * a, Y + a * 0.62);
      const zz = Math.max(zEnd, 0.3),
        af = R / Math.max(zz, 40 > zz ? zz : 40);
      c.lineTo(
        X + s * (zEnd < 44 ? R / Math.max(zEnd, 0.3) : 0),
        Y + (zEnd < 44 ? (R / Math.max(zEnd, 0.3)) * 0.62 : 0),
      );
      c.stroke();
    });
    // 터널에 들어가기 전: 암벽과 입구
    if (zIn > 0.22) {
      const a = R / zIn;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#070a13');
      g.addColorStop(0.5, '#141a26');
      g.addColorStop(1, '#0a0c12');
      c.fillStyle = g;
      c.beginPath();
      c.rect(0, 0, W, H);
      arch(c, X, Y, a);
      c.fill('evenodd');
      c.strokeStyle = '#39414f';
      c.lineWidth = Math.max(3, a * 0.13);
      c.beginPath();
      const fl = Y + a * 0.62,
        sp = Y - a * 0.12;
      c.moveTo(X - a * 1.06, fl);
      c.lineTo(X - a * 1.06, sp);
      c.arc(X, sp, a * 1.06, Math.PI, 0, false);
      c.lineTo(X + a * 1.06, fl);
      c.stroke();
      // 옹벽 돌 줄눈
      c.save();
      c.beginPath();
      c.rect(0, 0, W, H);
      arch(c, X, Y, a * 1.12);
      c.clip('evenodd');
      c.strokeStyle = 'rgba(120,135,165,.13)';
      c.lineWidth = Math.max(1, a * 0.008);
      c.beginPath();
      for (let r = -14; r <= 3; r++) {
        const yy = fl - r * a * 0.2;
        if (yy < -10 || yy > H + 10) continue;
        c.moveTo(0, yy);
        c.lineTo(W, yy);
        for (let q = -30; q <= 30; q++) {
          const xx = X + (q + (r & 1 ? 0.5 : 0)) * a * 0.46;
          if (xx < 0 || xx > W) continue;
          c.moveTo(xx, yy);
          c.lineTo(xx, yy - a * 0.2);
        }
      }
      c.stroke();
      c.restore();
      // 아치 돌과 쐐기돌
      c.strokeStyle = '#161b25';
      c.lineWidth = Math.max(1, a * 0.012);
      c.beginPath();
      for (let j = 0; j <= 14; j++) {
        const th = (Math.PI * j) / 14;
        c.moveTo(X + a * 0.995 * Math.cos(th), sp - a * 0.995 * Math.sin(th));
        c.lineTo(X + a * 1.125 * Math.cos(th), sp - a * 1.125 * Math.sin(th));
      }
      [0.14, 0.4].forEach((q) =>
        [-1, 1].forEach((sd) => {
          c.moveTo(X + sd * a * 0.995, Y + a * q);
          c.lineTo(X + sd * a * 1.125, Y + a * q);
        }),
      );
      c.stroke();
      c.fillStyle = '#4a5464';
      c.beginPath();
      c.moveTo(X - a * 0.07, sp - a * 0.98);
      c.lineTo(X + a * 0.07, sp - a * 0.98);
      c.lineTo(X + a * 0.1, sp - a * 1.2);
      c.lineTo(X - a * 0.1, sp - a * 1.2);
      c.closePath();
      c.fill();
      // 입구 위 등
      {
        const ly = sp - a * 1.34,
          lg = c.createRadialGradient(X, ly, 0, X, ly, a * 0.7);
        lg.addColorStop(0, 'rgba(255,226,170,.55)');
        lg.addColorStop(0.15, 'rgba(255,190,110,.22)');
        lg.addColorStop(1, 'rgba(255,170,80,0)');
        c.fillStyle = lg;
        c.beginPath();
        c.arc(X, ly, a * 0.7, 0, 7);
        c.fill();
        c.fillStyle = '#fff3d0';
        c.beginPath();
        c.arc(X, ly, Math.max(2, a * 0.03), 0, 7);
        c.fill();
      }
      c.fillStyle = '#0b0d12';
      c.fillRect(0, fl, W, H - fl);
      c.strokeStyle = 'rgba(200,205,220,.5)';
      c.lineWidth = 2;
      [-0.26, 0.26].forEach((s) => {
        c.beginPath();
        c.moveTo(X + (s * R) / 0.3, Y + (R / 0.3) * 0.62);
        c.lineTo(X + s * a, fl);
        c.stroke();
      });
      c.strokeStyle = 'rgba(180,200,240,.3)';
      c.lineWidth = 1;
      c.beginPath();
      for (const d of drops) {
        const y = ((d[1] + t * 1.6) % 1) * H,
          x = d[0] * W;
        c.moveTo(x, y);
        c.lineTo(x - 3, y + 18);
      }
      c.stroke();
    }
    const out = clamp(1 - zEnd / 5, 0, 1);
    if (out > 0) {
      c.fillStyle = 'rgba(214,228,255,' + (out * out).toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
    }
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    if (zEnd <= 0.3 && FX.done) {
      const d = FX.done;
      FX.done = null;
      d();
    }
  }
  // 기관실의 화실 불빛 배경 그리기
  function drawCab(t) {
    const c = cx;
    c.fillStyle = '#030202';
    c.fillRect(0, 0, W, H);
    if (!FX.frozen) {
      const g = c.createRadialGradient(W / 2, H * 1.1, 0, W / 2, H * 1.1, H * 0.9);
      const f = 0.5 + 0.08 * Math.sin(t * 7) + 0.05 * Math.sin(t * 13);
      g.addColorStop(0, 'rgba(255,130,40,' + f.toFixed(2) + ')');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
  }
  // 흩어지는 금빛 시계 파편 그리기
  function drawShards(dt) {
    const c = cx;
    for (const s of FX.shards) {
      s.age += dt;
      const slow = s.age > 0.5 ? Math.max(0, 1 - (s.age - 0.5) / 0.9) : 1;
      s.x += s.vx * dt * slow;
      s.y += s.vy * dt * slow;
      s.r += s.vr * dt * slow;
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.r);
      c.globalAlpha = s.a * (FX.fade != null ? FX.fade : 1);
      c.shadowColor = '#ffe29a';
      c.shadowBlur = 14;
      c.fillStyle = s.c;
      c.beginPath();
      c.moveTo(-s.z, -s.z * 0.4);
      c.lineTo(s.z, 0);
      c.lineTo(-s.z * 0.3, s.z * 0.8);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
  let last = performance.now();
  // 매 프레임 현재 연출 장면을 그리는 반복 함수
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (FX.mode === 'off') return;
    const t = (now - FX.t0) / 1000;
    FX.zoom += (FX.zoomTo - FX.zoom) * Math.min(1, dt * 0.5);
    if (FX.mode === 'title')
      drawLand(t, {
        rain: 1,
        moving: true,
        trainX: (h) => W * 1.05 - ((t * W * 0.022) % (W * 1.15 + h * 26)),
      });
    else if (FX.mode === 'tunnel') drawTunnel(t);
    else if (FX.mode === 'land')
      drawLand(t, { rain: 1, moving: true, low: 0.78, trainX: (h) => W * 0.3 - t * W * 0.004 });
    else if (FX.mode === 'cab') {
      drawCab(t);
      drawShards(dt);
    }

    /* 엔딩 1단계: 완전히 멈춘 세계 */
    else if (FX.mode === 'endStill') {
      drawLand(0, {
        stars: 1,
        rain: 2, // 고정된 빗방울
        moving: false, // 증기 및 열차 정지
        low: 0.95,
        trainX: (h) => W * 0.34,
      });
    }

    /* 엔딩 2단계: 빗방울과 별빛이 움직이기 시작 */
    else if (FX.mode === 'endWake') {
      drawLand(REDUCED ? 0 : t, {
        stars: 1,
        rain: REDUCED ? 2 : 1,
        moving: false, // 열차는 아직 정지
        low: 0.95,
        trainX: (h) => W * 0.34,
      });
    }

    /* 엔딩 3단계: 자정이 되어 열차 출발 */
    else if (FX.mode === 'end') {
      const motionT = REDUCED ? 0 : t;
      const k = clamp(motionT / 30, 0, 1);

      drawLand(motionT, {
        stars: 1 + k * 3,
        rain: REDUCED ? 2 : 1,
        dawn: motionT > 14,
        moving: !REDUCED,
        low: 0.95,
        trainX: (h) => W * 0.34 - motionT * W * 0.012,
      });
    }

    if (FX.flash > 0) {
      cx.fillStyle = 'rgba(214,228,255,' + FX.flash.toFixed(3) + ')';
      cx.fillRect(0, 0, W, H);
      FX.flash = Math.max(0, FX.flash - dt * 0.55);
    }
  }
  requestAnimationFrame(loop);

  /* ═════════ 화면 전환과 오프닝 ═════════ */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  }
  let skipFlag = false,
    cur = null,
    curHard = false;
  /* 화면을 눌러야 넘어가는 곳에 흰 세모를 띄우고, NUDGE_IDLE ms 동안 안 누르면 안내 글자를 띄운다 */
  const NUDGE_IDLE = 3000;
  // '화면을 눌러 계속' 안내 표시
  const Nudge = {
    t: 0,
    show(n) {
      this.hide();
      n.classList.add('show');
      this.t = setTimeout(() => n.classList.add('idle'), NUDGE_IDLE);
    },
    hide() {
      clearTimeout(this.t);
      document.querySelectorAll('.nudge').forEach((x) => x.classList.remove('show', 'idle'));
    },
  };
  // 일정 시간 기다리기 (건너뛰기·클릭으로 중단 가능)
  function wait(ms, hard) {
    return new Promise((res, rej) => {
      if (skipFlag) return rej('skip');
      const id = ms === Infinity ? 0 : setTimeout(done, ms);
      function done() {
        clearTimeout(id);
        cur = null;
        skipFlag ? rej('skip') : res();
      }
      cur = done;
      curHard = !!hard;
    });
  }
  const cap = $('#cap'),
    big = $('#big'),
    kick = $('#kicker'),
    iw = $('#iwatch');
  // 인트로 자막 한 줄을 보여 주고 기다리기
  async function line(label, text) {
    cap.classList.remove('show');
    await wait(450, true);
    cap.firstElementChild.textContent = label || '';
    cap.querySelector('p').textContent = text;
    cap.classList.add('show');
    await wait(600, true); // 글자가 떠오르는 동안은 넘기지 않음
    Nudge.show($('#nudge'));
    try {
      await wait(Infinity);
    } finally {
      Nudge.hide();
    } // 화면을 누를 때까지 기다림
  }
  /* 시계 위로 떨어지는 물방울: 위에서 내려다본 시점(방울이 커 보이다가 똑 — 파문) */
  let dripOn = false,
    dripT = 0;
  // 시계에서 떨어지는 눈물 한 방울 만들기
  function dripOne(big) {
    const e = el('div', 'dp' + (big ? ' big' : ''));
    e.style.left = 50 + (Math.random() - 0.5) * 46 + '%';
    e.style.top = 55 + (Math.random() - 0.5) * 38 + '%';
    e.innerHTML = '<i class="d"></i>';
    iw.appendChild(e);
    A.drip(0.55);
    setTimeout(() => e.remove(), 12000);
  }
  // 눈물 방울 반복 시작
  function startDrips() {
    stopDrips();
    dripOn = true;
    let n = 0;
    const go = () => {
      if (!dripOn || n >= 3) return;
      n++;
      dripOne(n === 3);
      dripT = setTimeout(go, 1100 + Math.random() * 500);
    };
    go();
  }
  // 눈물 방울 반복 멈춤
  function stopDrips() {
    dripOn = false;
    clearTimeout(dripT);
  }
  // 인트로 전체 진행 (터널 → 제목 → 안내 방송 → 시계 파괴)
  async function runIntro() {
    skipFlag = false;
    show('intro');
    const I = $('#intro');
    I.classList.remove('wide', 'mid');
    big.classList.remove('show');
    kick.classList.remove('show');
    cap.classList.remove('show');
    iw.className = '';
    big.querySelector('h2').innerHTML = [...'시간이 멈춘 열차']
      .map(
        (ch, i) =>
          '<span style="transition-delay:' +
          i * 0.16 +
          's">' +
          (ch === ' ' ? '&nbsp;' : ch) +
          '</span>',
      )
      .join('');
    FX.shards = [];
    FX.fade = null;
    FX.frozen = false;
    try {
      A.rumble(true);
      if (!REDUCED) {
        setMode('tunnel');
        await new Promise((res, rej) => {
          FX.done = res;
          cur = () => {
            cur = null;
            skipFlag ? rej('skip') : 0;
          };
          curHard = true;
        });
        A.whistle();
      }
      setMode('land');
      FX.flash = 1;
      I.classList.add('wide', 'mid');
      await wait(2600, true);
      kick.textContent = '2026년 12월 31일 · 밤 11시 59분';
      kick.classList.add('show');
      await wait(2200, true);
      A.grand();
      big.classList.add('show');
      await wait(7200);
      big.classList.remove('show');
      kick.classList.remove('show');
      FX.zoomTo = 1.7;
      await wait(1600, true);
      await line('', '덜컹, 덜컹. 규칙적으로 흔들리는 객실.\n창밖에는 비가 내리고 있다.');
      await line('안내 방송', '“승객 여러분, 잠시 안내 말씀드리겠습니다.”');
      await line(
        '안내 방송',
        '“오늘은 지난 40년간 이 열차와 함께해 온\n한시원 기관사님의 마지막 운행일입니다.”',
      );
      await line(
        '안내 방송',
        '“오랜 시간 다른 사람들의 목적지를 향해 달려오신 기관사님께서,\n이제는 자신만을 위한 새로운 길을 걸어가실 수 있도록 따뜻한 박수 부탁드립니다.”',
        7500,
      );
      A.applause(4.5);
      await line('', '객실에 박수 소리가 번진다.', 4200);
      cap.classList.remove('show');
      await wait(500, true);
      I.classList.remove('mid');
      setMode('cab');
      iw.innerHTML = watchSVG();
      iw.classList.add('show');
      await line('', '박수 소리가 들려오지만,\n기관사는 창밖을 바라보며 어두운 표정을 짓는다.');
      for (let i = 0; i < 4; i++) {
        A.tick();
        await wait(1000, true);
      }
      await line('', '주머니에서 꺼낸 오래된 회중시계.\n바늘은 11시 59분을 가리키고 있다.');
      iw.classList.add('grip');
      startDrips();
      await line('', '그는 슬픔을 이기지 못하고,\n떨리는 손으로 시계를 감싸 쥔다.');
      stopDrips();
      A.crack();
      iw.classList.add('cracked');
      await wait(900, true);
      A.crack();
      await wait(500, true);
      // 산산조각
      A.shatter();
      A.rumble(false);
      A.rain(false, 1.6);
      A.stopTheme(0.5);
      iw.classList.remove('grip');
      iw.classList.add('gone');
      FX.frozen = true;
      const r = iw.getBoundingClientRect(),
        ox = r.left + r.width / 2,
        oy = r.top + r.height * 0.55;
      for (let i = 0; i < 170; i++) {
        const a = Math.random() * 6.283,
          v = (180 + Math.random() * 900) * (H / 800);
        FX.shards.push({
          x: ox,
          y: oy,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 14,
          z: 3 + Math.random() * 9,
          a: 0.6 + Math.random() * 0.4,
          age: 0,
          c: ['#f0cf7e', '#fff3cf', '#c79a4b', '#e9c46a'][i % 4],
        });
      }
      cap.classList.remove('show');
      await wait(2600, true);
      await line('', '금빛 파편이 객실 곳곳으로 흩어진다.', 3400);
      await line('', '열차의 모든 소리가 끊긴다.', 3200);
      for (let i = 20; i >= 0; i--) {
        FX.fade = i / 20;
        await wait(60, true);
      }
      await line('', '그리고, 시간이 멈췄다.', 3600);
      cap.classList.remove('show');
      await wait(900, true);
    } catch (e) {
      if (e !== 'skip') throw e;
    }
    stopDrips();
    A.rumble(false);
    A.rain(false, 1.2);
    A.stopTheme(1.2);
    FX.done = null;
    startGame();
  }
  $('#intro').addEventListener('click', (e) => {
    if (e.target.id === 'skip') return;
    if (cur && !curHard) cur();
  });
  $('#skip').addEventListener('click', () => {
    skipFlag = true;
    if (cur) cur();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modal').classList.contains('on')) closeModal();
    if (e.key === 'Enter' || e.key === ' ') {
      if ($('#voice').classList.contains('on')) {
        e.preventDefault();
        $('#voice').click();
      } else if (
        $('#intro').classList.contains('on') &&
        document.activeElement.id !== 'skip' &&
        cur &&
        !curHard
      ) {
        e.preventDefault();
        cur();
      } else if (
        document.activeElement &&
        document.activeElement.classList &&
        document.activeElement.classList.contains('hot')
      ) {
        e.preventDefault();
        document.activeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    }
  });
  let rainPref = true;
  // 타이틀 화면의 소리 버튼 문구 갱신
  function setSnd(on) {
    const b = $('#sndOn');

    b.setAttribute('aria-pressed', on);

    $('#sndTxt').textContent = on ? '소리 켜짐 · 누르면 끕니다' : '소리 꺼짐 · 누르면 켭니다';
  }

  $('#sndOn').addEventListener('click', () => {
    A.init();
    if (!A.c) return;

    const on = !rainPref;
    rainPref = on;

    A.rain(on, 1.2);
    setSnd(on);
  });

  $('#board').addEventListener('click', () => {
    A.init();
    A.tick();

    if (rainPref !== false) {
      A.rain(true, 2);
      A.theme();
      setSnd(true);
    }
    runIntro();
  });

  /* ═════════ 게임 상태 ═════════ */
  const fresh = () => ({
    car: 4,
    reached: 4,
    flags: {},
    inv: [],
    notes: [],
    seen: {},
    hints: {},
    started: false,
  });
  let S = fresh();
  // 소지품과 일기 목록 (이름·아이콘·상세 보기)
  const ITEMS = {
    case: {
      n: '빈 회중시계 케이스',
      ic: IC.case,
      view: () =>
        '<div style="width:180px;margin:0 auto 10px">' +
        watchSVG({
          spring: has('spring') && S.flags.fixed,
          gear: S.flags.fixed,
          hand: S.flags.fixed,
          glass: S.flags.fixed,
        }) +
        '</div><p>어느새 주머니에 들어와 있던 시계 케이스. 이것을 지닌 사람만 멈춘 시간 속에서 움직일 수 있는 듯하다.</p><p>케이스 안쪽에 작은 글씨가 새겨져 있다.</p><p class="pencil">“자정에, 새벽역에서. — 윤정”</p><p>' +
        (S.flags.fixed
          ? '네 개의 부품이 모두 제자리를 찾았다.'
          : '속이 비어 있다. 흩어진 부품 네 개를 찾아야 한다. (현재 ' + partCount() + '/4)') +
        '</p>',
    },
    diary1: {
      n: '일기 · 1985년 4월',
      ic: IC.diary,
      view: () =>
        '<div class="hand">1985년 4월.\n오늘 새벽역에서 한 여자를 만났다.\n노란 우산을 쓰고 있던 그녀는 내게 웃으며 인사했다.\n이름은 윤정이라고 했다.\n이상하게도 그 미소가 오래 기억에 남는다.</div>',
    },
    spring: {
      n: '태엽',
      ic: IC.spring,
      part: 1,
      view: () => '<p>회중시계의 첫 번째 부품. 금빛 태엽이 손끝에서 희미하게 떨린다.</p>',
    },
    photo: {
      n: '윤정의 사진',
      ic: IC.photo,
      view: () =>
        '<div class="flip" id="flip"><div><div class="f">' +
        photoArt() +
        '</div><div class="bk">“우산, 코트, 목도리, 기차표. 그날의 널 기억해.”</div></div></div><div class="acts"><button class="btn ghost" type="button" id="flipb">뒷면 보기</button></div>',
      after: (b) => {
        b.querySelector('#flipb').onclick = (e) => {
          const f = b.querySelector('#flip');
          f.classList.toggle('back');
          e.target.textContent = f.classList.contains('back') ? '앞면 보기' : '뒷면 보기';
        };
      },
    },
    gear: {
      n: '톱니바퀴',
      ic: IC.gear,
      part: 1,
      view: () => '<p>회중시계의 두 번째 부품. 오르골 안쪽에서 멜로디와 함께 굴러 나왔다.</p>',
    },
    // 시계 부품과 함께 나오는 기관사의 일기
    diaryWatch: {
      n: '일기 · 1986년 봄',
      ic: IC.diary,
      view: () =>
        '<div class="hand">1986년 봄.\n오늘 처음으로 내 손으로 열차를 몰았다.\n윤정이 축하한다며 회중시계를 건넸다.\n자정에 새벽역에 닿으면 태엽을 감으라고 했다.\n그 시간에 승강장에 서 있겠다고.\n시계 안쪽에는 그녀의 글씨가 새겨져 있다.</div>',
    },
    diaryAnniv: {
      n: '일기 · 1997년 4월',
      ic: IC.diary,
      view: () =>
        '<div class="hand">1997년 4월.\n결혼하고 열 번째 봄이다.\n윤정과 처음 마주 앉았던 식당칸에서 커피 두 잔과 케이크 한 조각을 시켰다.\n그녀가 작은 오르골을 내밀었다.\n처음 만난 날의 자기 모습을 잊지 말라면서.\n노란 우산, 파란 코트, 빨간 목도리, 초록색 기차표.\n잊을 리가 없다.</div>',
    },
    diaryWard: {
      n: '일기 · 2004년 2월',
      ic: IC.diary,
      view: () =>
        '<div class="hand">2004년 2월.\n윤정이 병원에 있다.\n이제 새벽역까지 마중을 나오지 못한다.\n병실 창으로 내 열차가 지나가는 시간을 센다고 했다.\n자기가 서 있지 않더라도 자정에는 꼭 열차를 세워 달라고 했다.\n나는 그러겠다고 약속했다.</div>',
    },
    diary3: {
      n: '일기 · 2004년 3월 14일',
      ic: IC.diary,
      view: () =>
        '<div class="hand">2004년 3월 14일.\n윤정이 세상을 떠났다.\n그날 이후 새벽역에는 더 이상 노란 우산이 보이지 않는다.\n하지만 나는 여전히 매일 자정 그곳에 열차를 세운다.\n언젠가 다시 그녀가 서 있을 것만 같아서.</div>',
    },
    hand: {
      n: '시계바늘',
      ic: IC.hand,
      part: 1,
      view: () => '<p>회중시계의 세 번째 부품. 별빛을 머금은 듯 차갑게 빛난다.</p>',
    },
    diary4: {
      n: '일기 · 2026년 12월 31일',
      ic: IC.diary,
      view: () =>
        '<div class="hand">2026년 12월 31일.\n오늘이 마지막 운행이다.\n이제 이 열차를 떠나야 한다.\n사람들은 새로운 시작이라고 말하지만, 내게는 마지막 남은 약속마저 끝나는 날이다.\n윤정이 기다리던 새벽역.\n나는 아직 그곳을 떠날 준비가 되지 않았다.</div>',
    },
    glass: {
      n: '유리조각',
      ic: IC.glass,
      part: 1,
      view: () => '<p>회중시계의 네 번째 부품. 깨진 시계 유리의 마지막 조각이다.</p>',
    },
    letter: {
      n: '봉인된 편지',
      ic: IC.letter,
      view: () =>
        '<div style="width:200px;margin:0 auto 10px">' +
        IC.letter +
        '</div><p>노란 우산 그림이 그려진 편지. 겉봉에는 <b>한시원에게</b>라고 적혀 있다.</p><p>소인은 <b>3월 13일</b>. 봉투 귀퉁이는 여러 번 만진 듯 닳아 있지만, 봉인은 한 번도 뜯긴 적이 없다.</p><p>' +
        (S.flags.given
          ? '편지는 주인에게 돌아갔다.'
          : '봉인이 단단해서 열리지 않는다. 받을 사람의 손에 닿아야 할 것 같다.') +
        '</p>',
    },
  };
  // 기록을 처음 읽고 닫았을 때 주인공이 떠올리는 한마디
  const REFLECT = {
    diary1: '기관사에게도 누군가를 처음 만난 봄이 있었다. 노란 우산을 쓴 사람, 윤정.',
    photo: '사진 속 이 사람이 윤정인 모양이다. 뒷면의 글씨가 마음에 걸린다.',
    diaryWatch: '이 회중시계는 윤정이 첫 운행 날 건넨 선물이었다. 자정의 약속도 그날 시작됐다.',
    diaryAnniv: '두 사람은 부부였다. 오르골도, 그 순서도, 그녀가 남긴 것이었다.',
    diaryWard: '그녀는 아팠다. 그는 자정마다 열차를 세우겠다고 약속했다.',
    diary3:
      '그래서 그는 스물두 해 동안 자정마다 새벽역에 열차를 세웠던 것이다. 아무도 서 있지 않은 승강장에.',
    diary4:
      '오늘 운행이 끝나면 자정의 새벽역에 설 이유도 사라진다. 그래서 시계를 놓지 못했던 걸까.',
    letter:
      '받고도 차마 열지 못한 편지. 그는 그녀의 마지막 말을 스물두 해 동안 보관함 깊숙이 넣어 두었다.',
  };
  let pendingSay = null;
  // 소지품 한 줄 설명
  const DESC = {
    case: '어느새 주머니에 들어온 빈 케이스',
    spring: '시계를 움직이는 금빛 태엽',
    photo: '노란 우산을 든 윤정. 뒷면에 글씨가 있다',
    gear: '오르골에서 나온 작은 톱니바퀴',
    hand: '별빛을 머금은 시계바늘',
    glass: '깨진 시계 유리의 마지막 조각',
    letter: '“한시원에게”. 단단히 봉인되어 있다',
  };
  const DOCS = ['diary1', 'diaryWatch', 'diaryAnniv', 'diaryWard', 'diary3', 'diary4'];
  // 소지품 보유 여부
  const has = (id) => S.inv.includes(id);
  // 모은 시계 부품 개수
  const partCount = () => S.inv.filter((i) => ITEMS[i].part).length;
  // 화면 아래 짧은 알림 띄우기
  function toast(t) {
    const e = $('#toast');
    e.textContent = t;
    e.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => e.classList.remove('show'), 2400);
  }
  // 장면 아래 내레이션 문장 바꾸기
  function say(t) {
    const e = $('#say');
    e.textContent = t;
    e.classList.remove('in');
    void e.offsetWidth;
    e.classList.add('in');
  }
  // 소지품 추가
  function addItem(id, quiet) {
    if (has(id)) return;
    S.inv.push(id);
    renderSide(id);
    if (!quiet) {
      A.get();
      toast((DOCS.includes(id) ? '기관사의 일기 · ' : '소지품 획득 · ') + ITEMS[id].n);
    }
  }
  // 오른쪽 소지품·단서 수첩·일기 목록 다시 그리기
  function renderSide(newId) {
    const inv = S.inv.filter((i) => !DOCS.includes(i)),
      docs = S.inv
        .filter((i) => DOCS.includes(i))
        .sort((a, b) => DOCS.indexOf(a) - DOCS.indexOf(b));
    const I = $('#items');
    I.innerHTML = inv.length ? '' : '<div class="empty">아직 아무것도 없다</div>';
    inv.forEach((id) => {
      const it = ITEMS[id],
        e = el(
          'button',
          'item' + (id === newId ? ' new' : ''),
          it.ic + '<span><b>' + it.n + '</b>' + DESC[id] + '</span>',
        );
      e.type = 'button';
      e.onclick = () => showItem(id);
      I.append(e);
    });
    $('#parts').textContent = '시계 부품 ' + partCount() + ' / 4';
    $('#pslots').innerHTML = ['spring', 'gear', 'hand', 'glass']
      .map(
        (p) =>
          '<span class="' +
          (has(p) ? 'on' : '') +
          '" title="' +
          ITEMS[p].n +
          (has(p) ? '' : ' (아직 못 찾음)') +
          '">' +
          IC[p] +
          '</span>',
      )
      .join('');
    const D = $('#docs');
    D.innerHTML = docs.length ? '' : '<div class="empty">아직 주운 기록이 없다</div>';
    docs.forEach((id) => {
      const e = el(
        'button',
        'docbtn' + (id === newId ? ' new' : ''),
        ITEMS[id].n + '<span>읽기</span>',
      );
      e.type = 'button';
      e.onclick = () => showItem(id);
      D.append(e);
    });
    $('#docCount').textContent = docs.length + ' / ' + DOCS.length + '장';
    const N = $('#notes');
    N.innerHTML = S.notes.length ? '' : '<div class="empty">물건을 살펴보면 여기에 모여요</div>';
    S.notes.forEach((k) => {
      const c = +k.split(':')[0],
        id = k.split(':')[1],
        m = meta(c, id);
      if (!m) return;
      const e = el('button', 'docbtn', m.label + '<span>' + CARS[c].n + '</span>');
      e.type = 'button';
      e.onclick = () => openSpot(c, id);
      N.append(e);
    });
  }
  // 시계 부품마다 함께 나오는 기관사의 일기
  const PART_DOC = { spring: 'diaryWatch', gear: 'diaryAnniv', hand: 'diaryWard', glass: 'diary4' };
  // 부품을 얻었을 때: 부품 팝업을 열고, 함께 나온 일기를 바로 읽을 수 있게 한다
  function gotPart(id) {
    addItem(id);
    const doc = PART_DOC[id];
    addItem(doc, true);
    showItem(id, 1);
    const acts = el(
      'div',
      'acts',
      '<button class="btn" type="button">함께 나온 일기 읽기</button>',
    );
    acts.firstChild.onclick = () => {
      A.paper();
      showItem(doc, 1);
    };
    $('#modal .body').append(acts);
  }
  // 소지품 상세 팝업 열기
  function showItem(id, got) {
    const it = ITEMS[id];
    pendingSay = REFLECT[id] && !S.flags['r_' + id] ? id : null;
    const b = openModal({ k: got ? '획득' : '소지품', title: it.n, html: it.view() });
    if (it.after) it.after(b);
  }

  /* ═════════ 모달 ═════════ */
  let lastFocus = null;
  // 팝업 열기 (제목·내용·힌트 버튼)
  function openModal(o) {
    const m = $('#modal');
    lastFocus = document.activeElement;
    m.innerHTML = '';

    const p = el('div', 'panel' + (o.wide ? ' wide' : ''));
    p.innerHTML =
      '<button class="x" type="button" aria-label="닫기">×</button><p class="k">' +
      (o.k || '') +
      '</p><h3>' +
      o.title +
      '</h3><div class="body">' +
      (o.html || '') +
      '</div>';
    p.querySelector('.x').onclick = closeModal;
    m.append(p);

    /* 힌트는 '힌트 보기'를 눌러야 보인다. 한 번 본 힌트는 같은 퍼즐을 다시 열어도 보인다 */
    p.querySelectorAll('.hint').forEach((h) => {
      const key = o.title;
      S.hints = S.hints || {};
      if (S.hints[key]) return;
      h.classList.add('veiled');

      const bt = el('button', 'btn ghost hbtn', '힌트 보기');
      bt.type = 'button';
      bt.onclick = () => {
        S.hints[key] = 1;
        h.classList.remove('veiled');
        wrap.classList.remove('closed');
        h.classList.add('reveal');
        bt.remove();
        A.tick();
      };
      const wrap = el('div', 'hintwrap closed');
      h.before(wrap);
      wrap.append(bt, h);
    });
    m.classList.add('on');
    m.onclick = (e) => {
      if (e.target === m) closeModal();
    };

    p.querySelector('.x').focus();
    return p.querySelector('.body');
  }

  // 팝업 닫기
  function closeModal() {
    $('#modal').classList.remove('on');
    if (pendingSay) {
      const id = pendingSay;
      pendingSay = null;
      S.flags['r_' + id] = 1;
      say(REFLECT[id]);
    }
    hideTag();
    if (lastFocus && lastFocus.focus && !(lastFocus.closest && lastFocus.closest('#scene')))
      try {
        lastFocus.focus();
      } catch (e) {}
    else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // 숫자 다이얼 자물쇠 만들기
  function lock(n, sep) {
    const v = Array(n).fill(0),
      e = el('div', 'lock');
    v.forEach((_, i) => {
      const w = el(
        'div',
        'wheel',
        '<button type="button" aria-label="' +
          (i + 1) +
          '번째 숫자 올리기">▲</button><output id="dg' +
          i +
          '">0</output><button type="button" aria-label="' +
          (i + 1) +
          '번째 숫자 내리기">▼</button>',
      );
      const o = w.children[1];
      w.children[0].onclick = () => {
        v[i] = (v[i] + 1) % 10;
        o.textContent = v[i];
        A.tick();
      };
      w.children[2].onclick = () => {
        v[i] = (v[i] + 9) % 10;
        o.textContent = v[i];
        A.tick();
      };
      e.append(w);
      if (sep && sep.at === i + 1) e.append(el('span', 'sep', sep.ch));
    });
    return { e, get: () => v.join('') };
  }

  // 숫자 자물쇠 퍼즐 팝업 열기
  function puzzle(o) {
    const b = openModal({
      k: o.k || '퍼즐',
      title: o.title,
      html:
        (o.art || '') + '<p>' + o.desc + '</p><div class="hint"><b>힌트</b>' + o.hint + '</div>',
    });
    const L = lock(o.n, o.sep);
    b.append(L.e);
    const msg = el('p', 'msg', '');
    const acts = el(
      'div',
      'acts',
      '<button class="btn" type="button">' + (o.btn || '열기') + '</button>',
    );
    b.append(acts, msg);
    acts.firstChild.onclick = () => {
      if (L.get() === o.answer) {
        A.ok();
        closeModal();
        o.ok();
      } else {
        A.bad();
        L.e.classList.remove('shake');
        void L.e.offsetWidth;
        L.e.classList.add('shake');
        msg.textContent = o.wrong || '꿈쩍도 하지 않는다. 숫자가 틀린 것 같다.';
      }
    };
  }

  // 화면 전체 독백/대사를 한 줄씩 보여 주기
  function speak(lines, label) {
    return new Promise((res) => {
      const v = $('#voice'),
        p = v.querySelector('p');
      let i = 0;
      v.querySelector('small').textContent = label || '';
      const nd = $('#vnudge');
      const next = () => {
        if (i >= lines.length) {
          Nudge.hide();
          v.classList.remove('on');
          v.onclick = null;
          return res();
        }
        p.remove();
        p.innerHTML = lines[i++];
        v.insertBefore(p, nd);
        Nudge.show(nd);
      };
      v.classList.add('on');
      v.onclick = next;
      next();
    });
  }

  /* ═════════ 객실 그림 ═════════ */
  const DEFS =
    '<defs>' +
    '<linearGradient id="gNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050812"/><stop offset="1" stop-color="#1b2745"/></linearGradient>' +
    '<linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9c"/><stop offset=".5" stop-color="#c79a4b"/><stop offset="1" stop-color="#7a5524"/></linearGradient>' +
    '<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="gLamp"><stop offset="0" stop-color="#ffe6a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
    '<pattern id="pDia" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="26" height="26" fill="none"/><rect x="11" y="11" width="4" height="4" fill="#fff" opacity=".13"/></pattern>' +
    '<pattern id="pRug" width="60" height="40" patternUnits="userSpaceOnUse"><path d="M0 20L30 0L60 20L30 40Z" fill="none" stroke="#f0cf7e" stroke-opacity=".14" stroke-width="2"/></pattern>' +
    '</defs>';
  // 비 내리는 창밖 풍경 그림
  function rainWin(seed, w, h) {
    const r = mul(seed);
    let s =
      '<path d="M0 ' +
      h * 0.78 +
      'Q' +
      w * 0.3 +
      ' ' +
      h * 0.6 +
      ' ' +
      w * 0.55 +
      ' ' +
      h * 0.74 +
      'T' +
      w +
      ' ' +
      h * 0.66 +
      'V' +
      h +
      'H0Z" fill="#070b16"/>';
    for (let i = 0; i < 46; i++) {
      const x = r() * w,
        y = r() * h,
        l = 5 + r() * 9;
      s +=
        '<path d="M' +
        x.toFixed(0) +
        ' ' +
        y.toFixed(0) +
        'q-2 ' +
        (l * 0.6).toFixed(0) +
        ' 0 ' +
        l.toFixed(0) +
        'q2 -' +
        (l * 0.4).toFixed(0) +
        ' 0 -' +
        l.toFixed(0) +
        'Z" fill="#cfe0ff" opacity="' +
        (0.35 + r() * 0.5).toFixed(2) +
        '"/>';
    }
    return s;
  }
  const CONS = [
    [
      [60, 70],
      [150, 50],
      [190, 130],
      [90, 170],
    ],
    [
      [40, 60],
      [92, 104],
      [142, 66],
      [186, 122],
      [132, 184],
      [66, 204],
    ],
    [
      [72, 62],
      [184, 112],
      [102, 204],
    ],
  ];
  // 별자리가 보이는 창밖 풍경 그림
  function starWin(i, sc) {
    const p = CONS[i];
    let s =
      '<polyline points="' +
      p.map((q) => q.join(',')).join(' ') +
      (i !== 1 ? ' ' + p[0].join(',') : '') +
      '" fill="none" stroke="#9db8e8" stroke-width="' +
      1.2 / (sc || 1) +
      '" stroke-dasharray="4 5" opacity=".6"/>';
    p.forEach((q) => {
      s +=
        '<path transform="translate(' +
        q[0] +
        ' ' +
        q[1] +
        ')" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#fff6d8"/><circle cx="' +
        q[0] +
        '" cy="' +
        q[1] +
        '" r="14" fill="#fff6d8" opacity=".12"/>';
    });
    return s;
  }
  // 놋쇠 테두리 창문 그림
  function win(x, inner, id, label) {
    const y = 215,
      w = 250,
      h = 255;
    return (
      '<g' +
      (id
        ? ' class="hot" data-id="' + id + '" tabindex="0" role="button" aria-label="' + label + '"'
        : '') +
      '><rect x="' +
      (x - 16) +
      '" y="' +
      (y - 16) +
      '" width="' +
      (w + 32) +
      '" height="' +
      (h + 32) +
      '" rx="20" fill="url(#gBrass)"/><rect x="' +
      (x - 9) +
      '" y="' +
      (y - 9) +
      '" width="' +
      (w + 18) +
      '" height="' +
      (h + 18) +
      '" rx="14" fill="#24130b"/><svg x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '"><rect width="' +
      w +
      '" height="' +
      h +
      '" fill="url(#gNight)"/>' +
      inner +
      '</svg><path d="M' +
      (x + 10) +
      ' ' +
      (y + h - 14) +
      'L' +
      (x + 84) +
      ' ' +
      (y + 8) +
      'h34L' +
      (x + 44) +
      ' ' +
      (y + h - 14) +
      'Z" fill="#fff" opacity=".045"/></g>'
    );
  }
  // 창문 커튼 그림
  function curtain(x, c) {
    return (
      '<path d="M' +
      (x - 16) +
      ' 196h60q-6 120 -44 150q20 60 -16 142Z" fill="' +
      c +
      '"/><path d="M' +
      (x + 266) +
      ' 196h-60q6 120 44 150q-20 60 16 142Z" fill="' +
      c +
      '"/><rect x="' +
      (x - 26) +
      '" y="188" width="302" height="10" rx="5" fill="url(#gBrass)"/>'
    );
  }
  // 객실 좌석 그림
  function seat(x, w, c) {
    return (
      '<g><rect x="' +
      x +
      '" y="512" width="' +
      w +
      '" height="150" rx="18" fill="' +
      c +
      '"/><rect x="' +
      x +
      '" y="512" width="' +
      w +
      '" height="150" rx="18" fill="url(#pDia)"/><rect x="' +
      (x - 8) +
      '" y="650" width="' +
      (w + 16) +
      '" height="46" rx="10" fill="' +
      c +
      '"/><rect x="' +
      (x - 8) +
      '" y="650" width="' +
      (w + 16) +
      '" height="46" rx="10" fill="#000" opacity=".2"/><rect x="' +
      (x - 12) +
      '" y="690" width="' +
      (w + 24) +
      '" height="34" fill="#2a160d"/><rect x="' +
      (x - 12) +
      '" y="690" width="' +
      (w + 24) +
      '" height="5" fill="url(#gBrass)"/><rect x="' +
      (x - 6) +
      '" y="506" width="' +
      (w + 12) +
      '" height="10" rx="5" fill="url(#gBrass)"/></g>'
    );
  }
  // 다음 칸으로 가는 문 그림
  function door(to, open) {
    return (
      '<g class="hot" data-id="door" tabindex="0" role="button" aria-label="' +
      to +
      '로 가는 문" transform="translate(1344 0)"><rect x="56" y="186" width="188" height="540" rx="8" fill="#1c0f08"/><rect x="66" y="196" width="168" height="530" rx="4" fill="' +
      (open ? '#7a4a2b' : '#4a2a1a') +
      '"/><rect x="66" y="196" width="168" height="530" fill="url(#gWood)"/><rect x="92" y="230" width="116" height="170" rx="58" fill="' +
      (open ? '#ffd98a' : '#0a0f1c') +
      '" stroke="url(#gBrass)" stroke-width="6"/>' +
      (open ? '<circle cx="150" cy="315" r="130" fill="url(#gLamp)"/>' : '') +
      '<rect x="92" y="440" width="116" height="110" rx="4" fill="none" stroke="#2a160d" stroke-width="4"/><rect x="92" y="574" width="116" height="110" rx="4" fill="none" stroke="#2a160d" stroke-width="4"/><circle cx="216" cy="470" r="10" fill="url(#gBrass)"/><rect x="88" y="140" width="124" height="38" rx="4" fill="#120c09" stroke="url(#gBrass)" stroke-width="2"/><text x="150" y="166" text-anchor="middle" font-size="19" font-weight="800" fill="#f0cf7e">' +
      to +
      ' ▶</text></g>'
    );
  }
  // 천장 조명 그림
  function lamps(xs) {
    return xs
      .map(
        (x) =>
          '<circle cx="' +
          x +
          '" cy="118" r="150" fill="url(#gLamp)" opacity=".55"/><path d="M' +
          (x - 34) +
          ' 96h68l-12 26h-44Z" fill="url(#gBrass)"/><ellipse cx="' +
          x +
          '" cy="124" rx="24" ry="12" fill="#fff0c2"/>',
      )
      .join('');
  }
  /* 깨진 회중시계의 금빛 파편: 모든 칸의 공중에 멈춰 있다 */
  function shards(seed, n) {
    const r = mul(seed),
      cs = ['#f0cf7e', '#fff3cf', '#c79a4b', '#e9c46a'];
    let s = '<g class="shards" pointer-events="none">';
    for (let i = 0; i < (n || 26); i++) {
      const x = 40 + r() * 1520,
        y = 150 + r() * 520,
        z = 2.5 + r() * 5,
        a = r() * 360;
      s +=
        '<path class="shard" style="animation-delay:-' +
        (r() * 6).toFixed(2) +
        's" transform="translate(' +
        x.toFixed(0) +
        ' ' +
        y.toFixed(0) +
        ') rotate(' +
        a.toFixed(0) +
        ')" d="M' +
        (-z).toFixed(1) +
        ' ' +
        (-z * 0.4).toFixed(1) +
        'L' +
        z.toFixed(1) +
        ' 0L' +
        (-z * 0.3).toFixed(1) +
        ' ' +
        (z * 0.8).toFixed(1) +
        'Z" fill="' +
        cs[i % 4] +
        '"/>';
    }
    return s + '</g>';
  }
  // 객차 공통 배경(벽·천장·바닥) 위에 내용 얹기
  function shell(c, body) {
    return (
      '<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      c.label +
      '">' +
      DEFS +
      '<rect width="1600" height="900" fill="' +
      c.wall +
      '"/>' +
      Array.from(
        { length: 17 },
        (_, i) => '<rect x="' + i * 100 + '" y="130" width="100" height="600" fill="url(#gWood)"/>',
      ).join('') +
      '<path d="M0 0H1600V112Q800 62 0 112Z" fill="' +
      c.ceil +
      '"/><path d="M0 112Q800 62 1600 112V134Q800 84 0 134Z" fill="' +
      c.trim +
      '"/><path d="M0 132Q800 82 1600 132" fill="none" stroke="url(#gBrass)" stroke-width="3"/>' +
      '<rect y="596" width="1600" height="134" fill="' +
      c.dado +
      '"/><rect y="592" width="1600" height="8" fill="url(#gBrass)"/>' +
      Array.from(
        { length: 8 },
        (_, i) =>
          '<rect x="' +
          (20 + i * 200) +
          '" y="614" width="160" height="96" rx="4" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/>',
      ).join('') +
      '<rect y="726" width="1600" height="174" fill="' +
      c.floor +
      '"/><rect y="726" width="1600" height="174" fill="url(#pRug)"/><rect y="726" width="1600" height="70" fill="url(#gFloor)"/>' +
      lamps(c.lamps || [420, 800, 1180]) +
      body +
      shards([...c.label].reduce((a, ch) => a + ch.charCodeAt(0), 0)) +
      '</svg>'
    );
  }
  const T4 = {
    label: '4호차 객실',
    wall: '#5a3320',
    ceil: '#d9c9a3',
    trim: '#3b2115',
    dado: '#3b2115',
    floor: '#4a1719',
  };
  // 객차별 장면 그림
  const SCENES = {
    // 4호차 장면
    4: () =>
      shell(
        T4,
        door('3호차', S.flags.clock && S.flags.case4) +
          curtain(330, '#6b1d1f') +
          win(330, rainWin(11, 250, 255), 'window', '창밖') +
          curtain(720, '#6b1d1f') +
          win(720, rainWin(12, 250, 255)) +
          curtain(1110, '#6b1d1f') +
          win(1110, rainWin(13, 250, 255)) +
          // 벽시계
          '<g class="hot" data-id="clock" tabindex="0" role="button" aria-label="벽시계"><path d="M610 250q40 -46 80 0v250q-40 30 -80 0Z" fill="#2a160d" stroke="url(#gBrass)" stroke-width="3"/><circle cx="650" cy="296" r="38" fill="#efe2c4" stroke="url(#gBrass)" stroke-width="5"/>' +
          Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              '<line x1="' +
              (650 + 30 * Math.sin(a)).toFixed(1) +
              '" y1="' +
              (296 - 30 * Math.cos(a)).toFixed(1) +
              '" x2="' +
              (650 + 34 * Math.sin(a)).toFixed(1) +
              '" y2="' +
              (296 - 34 * Math.cos(a)).toFixed(1) +
              '" stroke="#2a1c12" stroke-width="2"/>'
            );
          }).join('') +
          (S.flags.clock
            ? '<line x1="650" y1="296" x2="649.7" y2="276" stroke="#2a1c12" stroke-width="4"/><line x1="650" y1="296" x2="647" y2="266" stroke="#2a1c12" stroke-width="2.5"/>'
            : '') +
          '<circle cx="650" cy="296" r="3.5" fill="#2a1c12"/><rect x="628" y="350" width="44" height="130" rx="4" fill="#120c09" stroke="#6e4a1c"/><line x1="656" y1="350" x2="662" y2="440" stroke="url(#gBrass)" stroke-width="3"/><circle cx="662" cy="448" r="14" fill="url(#gBrass)"/></g>' +
          seat(300, 310, '#1e5557') +
          seat(690, 310, '#1e5557') +
          seat(1080, 310, '#1e5557') +
          // 왼쪽 좌석: 박수치다 멈춘 승객
          '<g class="hot" data-id="clapper" tabindex="0" role="button" aria-label="박수치던 승객"><path d="M401 560q54 -30 108 0l14 130h-136Z" fill="#33283f"/><path d="M443 548l12 20l12 -20Z" fill="#4a566f"/><circle cx="455" cy="466" r="13" fill="#161b29"/><circle cx="455" cy="520" r="33" fill="#39445c"/><path d="M421 520Q420 482 455 482Q490 482 489 520Q478 500 455 501Q432 500 421 520Z" fill="#161b29"/><path d="M411 590q-40 10 -4 -60l22 8q-14 30 6 40Z" fill="#33283f"/><path d="M499 590q40 10 8 -62l-22 8q14 30 -8 40Z" fill="#33283f"/><ellipse cx="419" cy="524" rx="12" ry="16" fill="#39445c" transform="rotate(24 419 524)"/><ellipse cx="493" cy="522" rx="12" ry="16" fill="#39445c" transform="rotate(-24 493 522)"/></g>' +
          // 멈춘 승객
          '<g class="hot" data-id="passenger" tabindex="0" role="button" aria-label="멈춘 승객"><path d="M1196 560q54 -30 108 0l14 130h-136Z" fill="#232b3d"/><circle cx="1250" cy="520" r="34" fill="#39445c"/><path d="M1208 508q42 -52 84 0Z" fill="#161b29"/><rect x="1202" y="504" width="96" height="8" rx="4" fill="#161b29"/><path d="M1206 590q-40 10 -4 -60l22 8q-14 30 6 40Z" fill="#232b3d"/><path d="M1294 590q40 10 8 -62l-22 8q14 30 -8 40Z" fill="#232b3d"/><ellipse cx="1212" cy="524" rx="12" ry="16" fill="#39445c" transform="rotate(24 1212 524)"/><ellipse cx="1290" cy="522" rx="12" ry="16" fill="#39445c" transform="rotate(-24 1290 522)"/><rect x="1282" y="538" width="18" height="9" rx="2" fill="url(#gBrass)" transform="rotate(-24 1290 542)"/></g>' +
          // 부부 승객: 신문을 읽던 남편, 커피를 마시던 아내
          '<g class="hot" data-id="couple" tabindex="0" role="button" aria-label="멈춘 부부">' +
          '<path d="M716 560q54 -30 108 0l14 130h-136Z" fill="#232b3d"/><path d="M758 548l12 22l12 -22Z" fill="#4a566f"/><circle cx="770" cy="520" r="33" fill="#39445c"/><path d="M736 518Q736 482 770 482Q804 482 804 518Q796 500 776 500Q752 498 736 518Z" fill="#161b29"/>' +
          '<path d="M884 566q46 -28 92 0l12 124h-116Z" fill="#2f2a40"/><path d="M895 526Q892 484 930 484Q968 484 965 526L969 578Q930 590 891 578Z" fill="#161b29"/><circle cx="930" cy="523" r="30" fill="#39445c"/><path d="M900 520Q902 490 930 489Q958 490 960 520Q948 503 931 503Q930 502 929 503Q912 503 900 520Z" fill="#161b29"/>' +
          '<path d="M888 594q-24 22 12 36l8 -14q-14 -8 -4 -16Z" fill="#2f2a40"/><ellipse cx="912" cy="630" rx="24" ry="6" fill="#d8cdb6"/><ellipse cx="904" cy="627" rx="10" ry="7" fill="#39445c"/>' +
          '<path d="M972 598q36 6 14 -46l-20 8q10 22 -8 30Z" fill="#2f2a40"/><rect x="951" y="536" width="24" height="20" rx="4" fill="#efe2c4"/><path d="M975 541q9 0 9 5.5q0 5.5 -9 5.5" fill="none" stroke="#efe2c4" stroke-width="3"/><rect x="951" y="536" width="24" height="4" rx="2" fill="#6b3a22"/><ellipse cx="967" cy="558" rx="12" ry="8" fill="#39445c"/>' +
          '<path d="M957 528q-5 -8 0 -15q5 -7 0 -14M968 528q-5 -8 0 -15q5 -7 0 -14" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linecap="round" opacity=".5"/>' +
          '</g>' +
          // 남편이 펼쳐 든 신문
          '<g class="hot" data-id="news" tabindex="0" role="button" aria-label="남자가 읽던 신문"><path d="M696 574l74 12l74 -12l6 94l-80 12l-80 -12Z" fill="#e6dcc3" stroke="#2a1c12"/><path d="M770 586v94" stroke="#2a1c12" stroke-width="1.5" opacity=".5"/><path d="M706 590l54 9" stroke="#2a1c12" stroke-width="6"/><path d="M705 606l56 9M704 618l57 9M703 630l58 9M702 642l59 9M701 654l60 9" stroke="#2a1c12" stroke-width="2" opacity=".55"/><rect x="780" y="596" width="54" height="30" fill="#b9ae95" transform="skewY(-9)" style="transform-origin:780px 596px"/><path d="M780 640l56 -9M780 652l57 -9M780 664l58 -9" stroke="#2a1c12" stroke-width="2" opacity=".55"/><circle cx="826" cy="660" r="10" fill="none" stroke="#b3261e" stroke-width="2.5"/><ellipse cx="697" cy="622" rx="9" ry="13" fill="#39445c"/><ellipse cx="843" cy="622" rx="9" ry="13" fill="#39445c"/></g>' +
          // 가방 보관함 (왼쪽 벽)
          '<g><rect x="20" y="236" width="260" height="490" rx="6" fill="#2a160d"/><rect x="20" y="236" width="260" height="490" rx="6" fill="none" stroke="url(#gBrass)" stroke-width="3"/>' +
          '<rect x="92" y="246" width="116" height="28" rx="4" fill="#120c09" stroke="url(#gBrass)" stroke-width="1.5"/><text x="150" y="266" text-anchor="middle" font-size="16" font-weight="800" fill="#f0cf7e">가방 보관함</text>' +
          [284, 430, 576]
            .map(
              (y) =>
                '<rect x="34" y="' +
                y +
                '" width="232" height="136" fill="#140a06"/><rect x="34" y="' +
                y +
                '" width="232" height="30" fill="#000" opacity=".35"/><rect x="34" y="' +
                (y + 136) +
                '" width="232" height="10" fill="#5a3320"/><rect x="34" y="' +
                (y + 136) +
                '" width="232" height="3" fill="url(#gBrass)"/>',
            )
            .join('') +
          // 위 칸: 모자 상자와 작은 손가방
          '<ellipse cx="104" cy="420" rx="52" ry="8" fill="#3d4a66"/><rect x="52" y="356" width="104" height="64" fill="#3d4a66"/><ellipse cx="104" cy="356" rx="52" ry="8" fill="#56658a"/><rect x="52" y="380" width="104" height="6" fill="#c79a4b" opacity=".7"/>' +
          '<path d="M196 372q0 -20 18 -20q18 0 18 20" fill="none" stroke="#2a160d" stroke-width="6"/><rect x="176" y="370" width="76" height="50" rx="8" fill="#7a2a2c"/><rect x="206" y="370" width="16" height="16" rx="3" fill="url(#gBrass)"/>' +
          // 아래 칸: 낡은 트렁크
          '<rect x="54" y="630" width="192" height="82" rx="6" fill="#33402f"/><rect x="54" y="630" width="192" height="82" rx="6" fill="url(#gWood)"/><rect x="54" y="664" width="192" height="6" fill="#1c2419"/><rect x="84" y="630" width="12" height="82" fill="#5a3320"/><rect x="204" y="630" width="12" height="82" fill="#5a3320"/><rect x="140" y="656" width="20" height="20" rx="3" fill="url(#gBrass)"/>' +
          '</g>' +
          // 여행가방 (보관함 가운데 칸)
          '<g class="hot" data-id="suitcase" tabindex="0" role="button" aria-label="보관함 속 여행가방" transform="translate(150 566) scale(.8) translate(-480 -846)"><path d="M444 716v-16q0 -14 14 -14h44q14 0 14 14v16" fill="none" stroke="#2a160d" stroke-width="9"/><rect x="380" y="716" width="200" height="130" rx="12" fill="#6b3a22"/><rect x="380" y="716" width="200" height="130" rx="12" fill="url(#gWood)"/><rect x="408" y="716" width="18" height="130" fill="#3b2115"/><rect x="534" y="716" width="18" height="130" fill="#3b2115"/><rect x="456" y="740" width="48" height="26" rx="4" fill="url(#gBrass)"/><text x="480" y="759" text-anchor="middle" font-size="14" font-family="Special Elite,monospace" fill="#2a1c12">' +
          (S.flags.case4 ? 'OPEN' : '0000') +
          '</text></g>',
      ),
    // 3호차 장면
    3: () =>
      shell(
        {
          label: '3호차 식당칸',
          wall: '#6b1d1f',
          ceil: '#e2d2ac',
          trim: '#3a0e10',
          dado: '#4a2a1a',
          floor: '#1d3b3c',
          lamps: [455, 845, 1235],
        },
        door('2호차', S.flags.reg && S.flags.mbox) +
          curtain(330, '#4a1214') +
          win(330, rainWin(31, 250, 255)) +
          curtain(720, '#4a1214') +
          win(720, rainWin(32, 250, 255)) +
          curtain(1110, '#4a1214') +
          win(1110, rainWin(33, 250, 255)) +
          // 메뉴판
          '<g class="hot" data-id="menu" tabindex="0" role="button" aria-label="메뉴판"><rect x="60" y="206" width="184" height="150" rx="4" fill="#5a3320" stroke="url(#gBrass)" stroke-width="3"/><rect x="70" y="216" width="164" height="130" fill="#1d241f"/><text x="152" y="241" text-anchor="middle" font-size="17" fill="#e8e2cf" font-family="Nanum Pen Script,cursive">MENU</text><path d="M84 252h136" stroke="#e8e2cf" stroke-width="1" opacity=".4"/><path d="M84 272h60M84 296h78M84 320h50" stroke="#e8e2cf" stroke-width="2.4" opacity=".75"/><path d="M152 272h26M170 296h8M142 320h36" stroke="#e8e2cf" stroke-width="1.2" stroke-dasharray="2 4" opacity=".45"/><path d="M186 272h34M186 296h34M186 320h34" stroke="#e8e2cf" stroke-width="2.4" opacity=".75"/></g>' +
          // 식탁
          [330, 720, 1110]
            .map(
              (x) =>
                '<g>' +
                [-6, 186]
                  .map(
                    (o) =>
                      '<rect x="' +
                      (x + o) +
                      '" y="498" width="74" height="96" rx="12" fill="#3a0e10"/><rect x="' +
                      (x + o) +
                      '" y="498" width="74" height="96" rx="12" fill="url(#pDia)"/><rect x="' +
                      (x + o + 6) +
                      '" y="494" width="62" height="8" rx="4" fill="url(#gBrass)"/>',
                  )
                  .join('') +
                '<rect x="' +
                (x + 110) +
                '" y="500" width="8" height="70" fill="url(#gBrass)"/><path d="M' +
                (x + 84) +
                ' 500h60l-14 -40h-32Z" fill="#f2d7a0"/><circle cx="' +
                (x + 114) +
                '" cy="486" r="90" fill="url(#gLamp)" opacity=".8"/><path d="M' +
                (x - 30) +
                ' 580h310l26 130h-362Z" fill="#f2ece0"/><path d="M' +
                (x - 30) +
                ' 580h310l6 30h-322Z" fill="#fff" opacity=".5"/><path d="M' +
                (x - 56) +
                ' 710h362v14h-362Z" fill="#cfc6b4"/></g>',
            )
            .join('') +
          // 영수증
          '<g class="hot" data-id="receipt" tabindex="0" role="button" aria-label="식탁 위 영수증"><path d="M380 590h62v70l-10 -6l-10 6l-11 -6l-10 6l-11 -6l-10 6Z" fill="#fffdf6" stroke="#8d7a5c" transform="rotate(-8 410 620)"/><path d="M388 606h44M388 620h44M388 634h30" stroke="#6b4a2c" stroke-width="2.5" transform="rotate(-8 410 620)"/><ellipse cx="520" cy="622" rx="34" ry="10" fill="#d8cdb6"/><path d="M498 600h44v18q-22 14 -44 0Z" fill="#fff"/></g>' +
          // 셋째 식탁: 식사하다 멈춘 연인
          '<g class="hot" data-id="diners" tabindex="0" role="button" aria-label="식사하던 연인"><path d="M1095 582q46 -40 92 0Z" fill="#2a3144"/><path d="M1131 552l10 16l10 -16Z" fill="#56627c"/><circle cx="1141" cy="522" r="30" fill="#4a556f"/><path d="M1110 520Q1110 488 1141 488Q1172 488 1172 520Q1164 503 1146 503Q1124 502 1110 520Z" fill="#161b29"/><path d="M1178 582q16 -10 8 -34l-14 6q4 14 -8 22Z" fill="#2a3144"/><ellipse cx="1182" cy="546" rx="9" ry="7" fill="#4a556f"/><path d="M1184 542l10 -26M1190 517l2 -9M1194 518l3 -8M1198 520l4 -8" stroke="#cfd3d8" stroke-width="2.5" stroke-linecap="round"/><path d="M1289 582q44 -38 88 0Z" fill="#5a2f45"/><path d="M1300 526Q1297 486 1333 486Q1369 486 1366 526L1370 574Q1333 584 1296 574Z" fill="#161b29"/><circle cx="1333" cy="524" r="28" fill="#4a556f"/><path d="M1305 522Q1307 494 1333 493Q1359 494 1361 522Q1350 506 1334 506Q1333 505 1332 506Q1316 506 1305 522Z" fill="#161b29"/><path d="M1292 582q-18 -8 -10 -34l14 6q-4 14 6 22Z" fill="#5a2f45"/><ellipse cx="1288" cy="548" rx="9" ry="7" fill="#4a556f"/><rect x="1266" y="530" width="22" height="18" rx="4" fill="#fff"/><path d="M1266 535q-8 0 -8 5q0 5 8 5" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M1273 524q-4 -7 0 -13q4 -6 0 -12M1282 524q-4 -7 0 -13q4 -6 0 -12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4"/></g>' +
          // 첫 식탁: 두 번째 커피잔과 조각 케이크 (두 사람이 앉았던 자리)
          '<g pointer-events="none"><ellipse cx="470" cy="676" rx="34" ry="10" fill="#d8cdb6"/><path d="M448 654h44v18q-22 14 -44 0Z" fill="#fff"/><ellipse cx="470" cy="655" rx="20" ry="4" fill="#4a2a1a"/><path d="M492 658q12 0 12 7q0 7 -12 7" fill="none" stroke="#fff" stroke-width="3"/>' +
          '<path d="M464 644q-5 -9 0 -16q5 -8 0 -16M476 644q-5 -9 0 -16q5 -8 0 -16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>' +
          '<ellipse cx="572" cy="682" rx="34" ry="9" fill="#e9e2d0"/><path d="M552 676l36 -7v-15l-36 7Z" fill="#f3d9a4"/><path d="M552 661l36 -7l-13 -6l-33 8Z" fill="#7a3b2a"/><path d="M552 668l36 -7" stroke="#fff" stroke-width="2" opacity=".7"/><path d="M596 690l22 -5" stroke="#b9b3a4" stroke-width="3" stroke-linecap="round"/></g>' +
          // 셋째 식탁: 두 사람의 접시와 잔
          '<g pointer-events="none">' +
          [1170, 1330]
            .map(
              (x) =>
                '<ellipse cx="' +
                x +
                '" cy="656" rx="42" ry="12" fill="#e9e2d0"/><ellipse cx="' +
                x +
                '" cy="655" rx="28" ry="7" fill="#f8f4ea"/><path d="M' +
                (x - 56) +
                ' 648v22M' +
                (x + 56) +
                ' 648v22" stroke="#b9b3a4" stroke-width="3" stroke-linecap="round"/><path d="M' +
                (x + 30) +
                ' 606q0 16 10 18v12M' +
                (x + 50) +
                ' 606q0 16 -10 18M' +
                (x + 32) +
                ' 637h16" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>',
            )
            .join('') +
          // 접시 위 음식: 스테이크와 곁들임, 오믈렛
          '<ellipse cx="1166" cy="653" rx="18" ry="6" fill="#6e3324"/><ellipse cx="1165" cy="651" rx="14" ry="4" fill="#96502f"/><path d="M1156 651l16 -2M1158 654l14 -2" stroke="#5a2a1c" stroke-width="1.2"/><circle cx="1187" cy="654" r="4" fill="#3f9a56"/><circle cx="1181" cy="659" r="3" fill="#e0a13a"/><circle cx="1190" cy="659" r="2.5" fill="#c62f2b"/>' +
          '<path d="M1312 656q18 -15 38 0q-18 9 -38 0Z" fill="#edc65f"/><path d="M1318 654q7 -6 14 0M1330 652q6 -4 12 2" stroke="#c99a1c" stroke-width="1.5" fill="none"/><path d="M1322 651q8 -3 14 1" stroke="#c62f2b" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="1352" cy="657" r="3" fill="#3f9a56"/>' +
          '</g>' +
          // 오르골
          '<g class="hot" data-id="musicbox" tabindex="0" role="button" aria-label="오르골"><ellipse cx="846" cy="652" rx="78" ry="14" fill="#e9e2d0"/><rect x="786" y="596" width="120" height="52" rx="8" fill="#5a2a3a"/><rect x="786" y="596" width="120" height="52" rx="8" fill="url(#gWood)"/><rect x="786" y="590" width="120" height="14" rx="6" fill="url(#gBrass)"/>' +
          (S.flags.mbox
            ? '<path d="M790 592l14 -64h92l14 64Z" fill="#3a1826" stroke="url(#gBrass)" stroke-width="2"/><circle cx="846" cy="566" r="12" fill="#f0cf7e" opacity=".5"/>'
            : '') +
          '<circle cx="812" cy="624" r="7" fill="#c62f2b"/><circle cx="834" cy="624" r="7" fill="#3f9a56"/><circle cx="858" cy="624" r="7" fill="#f2c230"/><circle cx="880" cy="624" r="7" fill="#2d5fa8"/><path d="M906 618h16v-12" fill="none" stroke="url(#gBrass)" stroke-width="5"/></g>' +
          // 계산대
          '<g transform="translate(-1386 0)"><g><rect x="1386" y="560" width="214" height="170" fill="#3b2115"/><rect x="1386" y="552" width="214" height="14" fill="url(#gBrass)"/></g>' +
          '<g class="hot" data-id="register" tabindex="0" role="button" aria-label="금전등록기"><path d="M1420 552v-60q0 -14 14 -14h112q14 0 14 14v60Z" fill="#8a6223"/><path d="M1420 552v-60q0 -14 14 -14h112q14 0 14 14v60Z" fill="url(#gWood)"/><rect x="1440" y="430" width="100" height="52" rx="6" fill="url(#gBrass)"/><rect x="1450" y="440" width="80" height="30" fill="#120c09"/><text x="1490" y="462" text-anchor="middle" font-size="19" font-family="Special Elite,monospace" fill="#f0cf7e">' +
          (S.flags.reg ? '9000' : '----') +
          '</text>' +
          [0, 1, 2, 3]
            .map(
              (i) =>
                '<circle cx="' +
                (1448 + i * 28) +
                '" cy="508" r="9" fill="#efe2c4" stroke="#2a1c12"/><circle cx="' +
                (1448 + i * 28) +
                '" cy="534" r="9" fill="#efe2c4" stroke="#2a1c12"/>',
            )
            .join('') +
          (S.flags.reg
            ? '<rect x="1414" y="552" width="152" height="22" fill="#2a160d" stroke="url(#gBrass)"/>'
            : '') +
          '</g></g>',
      ),
    // 2호차 장면
    2: () =>
      shell(
        {
          label: '2호차 객실',
          wall: '#23344d',
          ceil: '#b9c2cf',
          trim: '#121c2c',
          dado: '#1a2638',
          floor: '#2a1f3a',
          lamps: [],
        },
        door('1호차', S.flags.trunk && S.flags.sbox) +
          win(330, starWin(0), 'stars', '별이 보이는 창') +
          win(720, starWin(1), 'stars', '별이 보이는 창') +
          win(1110, starWin(2), 'stars', '별이 보이는 창') +
          // 달력
          '<g class="hot" data-id="calendar" tabindex="0" role="button" aria-label="벽 달력" transform="translate(-537 44)"><rect x="604" y="250" width="96" height="124" fill="#f6f1e4" stroke="#2a1c12"/><rect x="604" y="250" width="96" height="30" fill="#6b1d1f"/><text x="652" y="272" text-anchor="middle" font-size="18" font-weight="800" fill="#fde9c0">3월</text>' +
          Array.from(
            { length: 20 },
            (_, i) =>
              '<rect x="' +
              (612 + (i % 5) * 17) +
              '" y="' +
              (290 + Math.floor(i / 5) * 19) +
              '" width="11" height="11" fill="#2a1c12" opacity=".22"/>',
          ).join('') +
          '<circle cx="634.5" cy="295.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="651.5" cy="333.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="668.5" cy="352.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="652" cy="246" r="5" fill="url(#gBrass)"/></g>' +
          seat(300, 310, '#3c3566') +
          seat(690, 310, '#3c3566') +
          seat(1080, 310, '#3c3566') +
          // 그림책을 읽다 잠든 아이
          '<g class="hot" data-id="child" tabindex="0" role="button" aria-label="잠든 아이"><path d="M312 606q34 -22 70 0l12 84h-92Z" fill="#5b4d7e"/><path d="M312 606q34 -22 70 0l4 26q-38 -14 -78 0Z" fill="#6f609a"/><path d="M378 632q20 4 34 16l-6 12q-16 -8 -32 -8Z" fill="#5b4d7e"/><ellipse cx="412" cy="654" rx="9" ry="6" fill="#4a5878"/><g transform="rotate(16 350 566)"><path d="M322 566Q320 534 350 534Q380 534 378 566L380 590Q350 598 320 590Z" fill="#161b29"/><circle cx="350" cy="568" r="25" fill="#4a5878"/><path d="M325 564Q328 540 350 540Q372 540 375 564Q362 552 350 553Q336 552 325 564Z" fill="#161b29"/><path d="M338 574q5 4 10 0M354 574q5 4 10 0" fill="none" stroke="#161b29" stroke-width="2" stroke-linecap="round"/></g></g>' +
          // 불 꺼진 객실에 떨어지는 달빛
          '<g pointer-events="none">' +
          [330, 720, 1110]
            .map(
              (x) =>
                '<path d="M' +
                x +
                ' 486h250l-110 414h-250Z" fill="#9db8e8" opacity=".06"/><path d="M' +
                (x - 110) +
                ' 900l48 -180h250l-48 180Z" fill="#9db8e8" opacity=".07"/>',
            )
            .join('') +
          '</g>' +
          // 그림책
          '<g class="hot" data-id="book" tabindex="0" role="button" aria-label="좌석 위 그림책"><path d="M400 640l72 -12l72 12v40l-72 -10l-72 10Z" fill="#f4eedd" stroke="#2a1c12"/><path d="M472 628v42" stroke="#2a1c12"/><path d="M414 648l44 -7M414 660l44 -7" stroke="#2b5b8a" stroke-width="3"/><path transform="translate(508 652) scale(.8)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#f2c230"/></g>' +
          // 예약석: 수십 년째 비워 둔 자리와 노란 우산
          '<g class="hot" data-id="reserved" tabindex="0" role="button" aria-label="예약석"><rect x="1196" y="536" width="96" height="46" rx="3" fill="#f4eedd" stroke="#6e4a1c" stroke-width="2"/><text x="1244" y="566" text-anchor="middle" font-size="22" font-weight="800" fill="#6b1d1f" font-family="Nanum Myeongjo,serif">예약석</text><g transform="translate(1334 612)"><path d="M0 -72V-58" stroke="#3b2115" stroke-width="4" stroke-linecap="round"/><path d="M0 -60Q13 -18 6 36H-6Q-13 -18 0 -60Z" fill="#f2c230"/><path d="M0 -60V36M-5 -30Q-6 4 -3 36M5 -30Q6 4 3 36" fill="none" stroke="#c99a1c" stroke-width="1.5"/><rect x="-8" y="8" width="16" height="6" rx="2" fill="#8a6223"/><path d="M0 36V54Q0 66 -10 64" fill="none" stroke="#3b2115" stroke-width="5" stroke-linecap="round"/></g></g>' +
          // 트렁크
          '<g class="hot" data-id="trunk" tabindex="0" role="button" aria-label="낡은 트렁크"><rect x="820" y="726" width="250" height="126" rx="10" fill="#4a2a1a"/><rect x="820" y="726" width="250" height="126" rx="10" fill="url(#gWood)"/><rect x="820" y="' +
          (S.flags.trunk ? 700 : 770) +
          '" width="250" height="10" fill="url(#gBrass)"/>' +
          (S.flags.trunk
            ? '<path d="M820 726l20 -60h210l20 60Z" fill="#3b2115" stroke="url(#gBrass)" stroke-width="2"/>'
            : '') +
          '<rect x="850" y="726" width="16" height="126" fill="#2a160d"/><rect x="1024" y="726" width="16" height="126" fill="#2a160d"/><rect x="916" y="752" width="58" height="30" rx="4" fill="url(#gBrass)"/><text x="945" y="773" text-anchor="middle" font-size="15" font-family="Special Elite,monospace" fill="#2a1c12">' +
          (S.flags.trunk ? '0314' : '0000') +
          '</text></g>' +
          // 별 상자
          '<g transform="translate(-1390 0)"><g><rect x="1440" y="600" width="130" height="126" fill="#121c2c"/><rect x="1430" y="592" width="150" height="12" fill="url(#gBrass)"/></g>' +
          '<g class="hot" data-id="starbox" tabindex="0" role="button" aria-label="별이 새겨진 놋쇠 상자"><rect x="1456" y="530" width="98" height="62" rx="6" fill="url(#gBrass)"/><rect x="1456" y="530" width="98" height="18" rx="6" fill="#7a5524" opacity=".5"/>' +
          [1478, 1505, 1532]
            .map(
              (x) =>
                '<path transform="translate(' +
                x +
                ' 568) scale(.75)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#2a1c12"/>',
            )
            .join('') +
          (S.flags.sbox
            ? '<path d="M1456 532l8 -34h82l8 34Z" fill="#7a5524" stroke="#f3dc9c"/>'
            : '') +
          '</g></g>',
      ),
    // 1호차 장면
    1: () =>
      shell(
        {
          label: '1호차 승무원칸',
          wall: '#3d4a3c',
          ceil: '#cfc8ae',
          trim: '#232b22',
          dado: '#262e25',
          floor: '#3b2115',
          lamps: [520, 1060],
        },
        // 기관실 문
        '<g class="hot" data-id="door" tabindex="0" role="button" aria-label="기관실 연결문" transform="translate(1344 0)"><rect x="56" y="186" width="188" height="540" rx="8" fill="#0d100d"/><rect x="66" y="196" width="168" height="530" rx="4" fill="' +
          (S.flags.cabdoor ? '#55604f' : '#2c342b') +
          '"/><circle cx="150" cy="300" r="52" fill="' +
          (S.flags.cabdoor ? '#ffb060' : '#0a0f1c') +
          '" stroke="url(#gBrass)" stroke-width="7"/>' +
          (S.flags.cabdoor ? '<circle cx="150" cy="300" r="140" fill="url(#gLamp)"/>' : '') +
          Array.from(
            { length: 10 },
            (_, i) =>
              '<circle cx="' +
              (78 + (i % 2) * 144) +
              '" cy="' +
              (220 + Math.floor(i / 2) * 120) +
              '" r="4" fill="#8d9a86"/>',
          ).join('') +
          '<rect x="100" y="420" width="100" height="96" rx="4" fill="#f6f1e4" stroke="url(#gBrass)" stroke-width="3"/><rect x="100" y="420" width="100" height="22" fill="#6b1d1f"/><circle cx="122" cy="420" r="4.5" fill="#d9c9a3"/><circle cx="178" cy="420" r="4.5" fill="#d9c9a3"/>' +
          Array.from(
            { length: 15 },
            (_, i) =>
              '<rect x="' +
              (111 + (i % 5) * 17) +
              '" y="' +
              (452 + Math.floor(i / 5) * 19) +
              '" width="11" height="11" fill="#2a1c12" opacity=".22"/>',
          ).join('') +
          '<circle cx="150" cy="536" r="6" fill="' +
          (S.flags.cabdoor ? '#4be37a' : '#e0362c') +
          '"/><rect x="80" y="140" width="140" height="38" rx="4" fill="#120c09" stroke="url(#gBrass)" stroke-width="2"/><text x="150" y="166" text-anchor="middle" font-size="19" font-weight="800" fill="#f0cf7e">기관실 ▶</text></g>' +
          '<g class="hot" data-id="plaque" tabindex="0" role="button" aria-label="문 옆 명판" transform="translate(950 0)"><rect x="270" y="400" width="92" height="64" rx="4" fill="url(#gBrass)"/><path d="M282 420h68M282 434h68M282 448h44" stroke="#2a1c12" stroke-width="3"/></g>' +
          // 운행 안내문
          '<g class="hot" data-id="notice" tabindex="0" role="button" aria-label="운행 안내문"><rect x="410" y="220" width="170" height="230" fill="#f6f1e4" stroke="#2a1c12" stroke-width="2"/><rect x="410" y="220" width="170" height="40" fill="#6b1d1f"/><text x="495" y="247" text-anchor="middle" font-size="19" font-weight="800" fill="#fde9c0">운행 안내</text><path d="M426 284h138M426 304h138M426 324h100M426 360h138M426 380h138M426 400h80" stroke="#2a1c12" stroke-width="3" opacity=".55"/><circle cx="495" cy="216" r="6" fill="#b3261e"/></g>' +
          win(660, rainWin(41, 250, 255)) +
          // 11시 59분에 멈춘 벽시계
          '<g class="hot" data-id="clock1" tabindex="0" role="button" aria-label="멈춘 벽시계"><circle cx="1266" cy="300" r="46" fill="url(#gBrass)"/><circle cx="1266" cy="300" r="38" fill="#efe2c4"/>' +
          Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              '<line x1="' +
              (1266 + 30 * Math.sin(a)).toFixed(1) +
              '" y1="' +
              (300 - 30 * Math.cos(a)).toFixed(1) +
              '" x2="' +
              (1266 + 35 * Math.sin(a)).toFixed(1) +
              '" y2="' +
              (300 - 35 * Math.cos(a)).toFixed(1) +
              '" stroke="#2a1c12" stroke-width="2"/>'
            );
          }).join('') +
          '<line x1="1266" y1="300" x2="1265.8" y2="280" stroke="#2a1c12" stroke-width="4" stroke-linecap="round"/><line x1="1266" y1="300" x2="1263" y2="270" stroke="#2a1c12" stroke-width="2.5" stroke-linecap="round"/><circle cx="1266" cy="300" r="3.5" fill="#2a1c12"/></g>' +
          // 은퇴 축하 자리: 종이 띠, 벤치 위 신호등·보온병·승무원 모자
          '<g class="hot" data-id="farewell" tabindex="0" role="button" aria-label="은퇴 축하 자리"><path d="M648 506Q785 546 922 506" fill="none" stroke="#8a6223" stroke-width="2.5"/><g transform="translate(690 513) rotate(8)"><rect x="-21" y="0" width="42" height="50" rx="2" fill="#f4eedd" stroke="#6e4a1c"/><text x="0" y="35" text-anchor="middle" font-size="27" font-weight="800" fill="#2a1c12" font-family="Nanum Myeongjo,serif">감</text></g><g transform="translate(738 521) rotate(4)"><rect x="-21" y="0" width="42" height="50" rx="2" fill="#f2d98a" stroke="#6e4a1c"/><text x="0" y="35" text-anchor="middle" font-size="27" font-weight="800" fill="#2a1c12" font-family="Nanum Myeongjo,serif">사</text></g><g transform="translate(785 524) rotate(0)"><rect x="-21" y="0" width="42" height="50" rx="2" fill="#f4eedd" stroke="#6e4a1c"/><text x="0" y="35" text-anchor="middle" font-size="27" font-weight="800" fill="#2a1c12" font-family="Nanum Myeongjo,serif">합</text></g><g transform="translate(832 521) rotate(-4)"><rect x="-21" y="0" width="42" height="50" rx="2" fill="#f2d98a" stroke="#6e4a1c"/><text x="0" y="35" text-anchor="middle" font-size="27" font-weight="800" fill="#2a1c12" font-family="Nanum Myeongjo,serif">니</text></g><g transform="translate(880 513) rotate(-8)"><rect x="-21" y="0" width="42" height="50" rx="2" fill="#f4eedd" stroke="#6e4a1c"/><text x="0" y="35" text-anchor="middle" font-size="27" font-weight="800" fill="#2a1c12" font-family="Nanum Myeongjo,serif">다</text></g><rect x="640" y="650" width="300" height="16" rx="3" fill="#5a3320"/><rect x="660" y="666" width="14" height="60" fill="#3b2115"/><rect x="906" y="666" width="14" height="60" fill="#3b2115"/>' +
          '<path d="M690 600q22 -24 44 0" fill="none" stroke="#2a160d" stroke-width="5"/><rect x="688" y="600" width="48" height="50" rx="6" fill="#232b22"/><rect x="696" y="608" width="32" height="34" rx="4" fill="#4a5a52"/><rect x="684" y="596" width="56" height="8" rx="3" fill="url(#gBrass)"/>' +
          '<rect x="770" y="590" width="30" height="60" rx="6" fill="#6b1d1f"/><rect x="774" y="578" width="22" height="16" rx="4" fill="#b9b3a4"/>' +
          '<path d="M836 650q0 -30 40 -30q40 0 40 30Z" fill="#141c2b"/><rect x="828" y="644" width="96" height="8" rx="4" fill="#0c1220"/><rect x="840" y="636" width="72" height="6" fill="url(#gBrass)"/></g>' +
          // 기록 보관함
          '<g class="hot" data-id="cabinet" tabindex="0" role="button" aria-label="기록 보관함"><rect x="990" y="330" width="190" height="396" rx="6" fill="#55604f"/><rect x="990" y="330" width="190" height="396" rx="6" fill="url(#gWood)"/>' +
          [0, 1, 2]
            .map(
              (i) =>
                '<rect x="1004" y="' +
                (346 + i * 126) +
                '" width="162" height="112" rx="4" fill="' +
                (S.flags.cab && i === 0 ? '#161b15' : '#48523f') +
                '" stroke="#232b22" stroke-width="3"/><rect x="1060" y="' +
                (388 + i * 126) +
                '" width="50" height="12" rx="6" fill="url(#gBrass)"/>',
            )
            .join('') +
          '<rect x="1050" y="352" width="70" height="26" rx="3" fill="#f6f1e4"/><text x="1085" y="371" text-anchor="middle" font-size="15" font-weight="800" fill="#2a1c12">운행 기록</text></g>' +
          // 물품 보관함
          '<g class="hot" data-id="locker" tabindex="0" role="button" aria-label="물품 보관함" transform="translate(-1200 0)"><rect x="1240" y="250" width="320" height="476" rx="6" fill="#4a2a1a"/><rect x="1240" y="250" width="320" height="476" fill="url(#gWood)"/><rect x="1330" y="262" width="140" height="30" rx="3" fill="#120c09" stroke="url(#gBrass)"/><text x="1400" y="284" text-anchor="middle" font-size="17" font-weight="800" fill="#f0cf7e">물품 보관함</text>' +
          Array.from({ length: 9 }, (_, i) => {
            const x = 1256 + (i % 3) * 98,
              y = 306 + Math.floor(i / 3) * 136;
            return (
              '<rect x="' +
              x +
              '" y="' +
              y +
              '" width="90" height="126" rx="3" fill="#1c110a"/><rect x="' +
              (x + 12) +
              '" y="' +
              (y + 70 + ((i * 7) % 20)) +
              '" width="' +
              (40 + ((i * 13) % 26)) +
              '" height="' +
              (34 - ((i * 7) % 20) + 20) +
              '" fill="' +
              [
                '#e6dcc3',
                '#6b1d1f',
                '#1e5557',
                '#c79a4b',
                '#e6dcc3',
                '#33415e',
                '#e6dcc3',
                '#5a3320',
                '#e6dcc3',
              ][i] +
              '" opacity=".85"/>'
            );
          }).join('') +
          '</g>',
      ),
    // 기관실 장면
    0: () =>
      '<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="기관실">' +
      DEFS +
      '<radialGradient id="gFire"><stop offset="0" stop-color="#ffd27a"/><stop offset=".4" stop-color="#ff7a1f"/><stop offset="1" stop-color="#7a1c05" stop-opacity="0"/></radialGradient>' +
      '<rect width="1600" height="900" fill="#1a211b"/><rect width="1600" height="900" fill="url(#gFloor)" transform="rotate(180 800 450)"/>' +
      Array.from(
        { length: 32 },
        (_, i) =>
          '<circle cx="' +
          (30 + i * 50) +
          '" cy="40" r="6" fill="#3d4a3c"/><circle cx="' +
          (30 + i * 50) +
          '" cy="700" r="6" fill="#3d4a3c"/>',
      ).join('') +
      '<rect y="726" width="1600" height="174" fill="#0e0f0d"/>' +
      Array.from(
        { length: 20 },
        (_, i) => '<path d="M' + i * 84 + ' 726l40 174" stroke="#2a2f29" stroke-width="3"/>',
      ).join('') +
      // 전방 창
      '<rect x="70" y="150" width="330" height="300" rx="20" fill="url(#gBrass)"/><rect x="86" y="166" width="298" height="268" rx="12" fill="url(#gNight)"/><svg x="86" y="166" width="298" height="268" viewBox="0 0 298 268">' +
      rainWin(51, 298, 268) +
      '</svg>' +
      // 기관사
      '<g class="hot" data-id="engineer" tabindex="0" role="button" aria-label="한시원 기관사"><path d="M330 430q70 -40 140 0l30 300h-200Z" fill="#141c2b"/><path d="M356 430l44 60l44 -60" fill="none" stroke="#c79a4b" stroke-width="3"/><circle cx="400" cy="372" r="46" fill="#4a5568"/><path d="M350 356q50 -62 100 0Z" fill="#0c111c"/><rect x="336" y="350" width="112" height="12" rx="6" fill="#0c111c"/><circle cx="400" cy="336" r="7" fill="url(#gBrass)"/><path d="M468 470q40 100 10 190l-26 -6q14 -90 -8 -160Z" fill="#141c2b"/><ellipse cx="466" cy="668" rx="16" ry="20" fill="#4a5568"/>' +
      (S.flags.given
        ? '<rect x="446" y="660" width="46" height="30" fill="#f4eedd" stroke="#6e4a1c" transform="rotate(-12 468 676)"/>'
        : '<path d="M468 688q6 40 -8 62" fill="none" stroke="url(#gBrass)" stroke-width="3" stroke-dasharray="5 4"/>') +
      '</g>' +
      // 계기
      '<g class="hot" data-id="gauges" tabindex="0" role="button" aria-label="계기판"><path d="M620 300h520M700 300v-130h360v130M880 170v-80" fill="none" stroke="#7a5524" stroke-width="14"/>' +
      [
        [660, 300, 54],
        [800, 210, 44],
        [960, 210, 44],
        [1100, 300, 54],
        [880, 330, 66],
      ]
        .map(
          (g, i) =>
            '<circle cx="' +
            g[0] +
            '" cy="' +
            g[1] +
            '" r="' +
            g[2] +
            '" fill="url(#gBrass)"/><circle cx="' +
            g[0] +
            '" cy="' +
            g[1] +
            '" r="' +
            (g[2] - 9) +
            '" fill="#efe2c4"/>' +
            Array.from({ length: 9 }, (_, k) => {
              const a = ((-120 + k * 30) * Math.PI) / 180;
              return (
                '<line x1="' +
                (g[0] + (g[2] - 14) * Math.sin(a)).toFixed(1) +
                '" y1="' +
                (g[1] - (g[2] - 14) * Math.cos(a)).toFixed(1) +
                '" x2="' +
                (g[0] + (g[2] - 20) * Math.sin(a)).toFixed(1) +
                '" y2="' +
                (g[1] - (g[2] - 20) * Math.cos(a)).toFixed(1) +
                '" stroke="#2a1c12" stroke-width="2"/>'
              );
            }).join('') +
            '<line x1="' +
            g[0] +
            '" y1="' +
            g[1] +
            '" x2="' +
            (g[0] + (g[2] - 18) * Math.sin(((i * 47 - 60) * Math.PI) / 180)).toFixed(1) +
            '" y2="' +
            (g[1] - (g[2] - 18) * Math.cos(((i * 47 - 60) * Math.PI) / 180)).toFixed(1) +
            '" stroke="#b3261e" stroke-width="3"/><circle cx="' +
            g[0] +
            '" cy="' +
            g[1] +
            '" r="5" fill="#2a1c12"/>',
        )
        .join('') +
      '</g>' +
      // 화실
      '<circle cx="880" cy="760" r="260" fill="url(#gFire)" opacity=".5"/><path d="M770 726v-110q110 -90 220 0v110Z" fill="#0b0b0a" stroke="#3d4a3c" stroke-width="10"/><path d="M800 726v-90q80 -66 160 0v90Z" fill="url(#gFire)"/><path d="M830 726q10 -70 34 -50q6 -50 30 -10q20 -30 30 60Z" fill="#ffe6a8" opacity=".8"/>' +
      // 배관과 밸브
      '<g pointer-events="none"><path d="M1180 200h290M1240 200v170M1400 200v100M430 96h1060" fill="none" stroke="#2f3a30" stroke-width="16" stroke-linecap="round"/><path d="M1180 196h290M430 92h1060" fill="none" stroke="#56655a" stroke-width="3" opacity=".6"/>' +
      [1210, 1320, 1440, 560, 760, 1000]
        .map(
          (x, i) =>
            '<rect x="' +
            (x - 6) +
            '" y="' +
            (i < 3 ? 186 : 82) +
            '" width="12" height="28" rx="3" fill="#7a5524"/>',
        )
        .join('') +
      '<circle cx="1240" cy="392" r="28" fill="none" stroke="#8b1c1c" stroke-width="7"/><path d="M1212 392h56M1240 364v56M1220 372l40 40M1260 372l-40 40" stroke="#8b1c1c" stroke-width="4"/><circle cx="1240" cy="392" r="6" fill="#c79a4b"/>' +
      '<circle cx="1400" cy="326" r="28" fill="#efe2c4" stroke="url(#gBrass)" stroke-width="6"/><line x1="1400" y1="326" x2="1386" y2="312" stroke="#b3261e" stroke-width="3" stroke-linecap="round"/><circle cx="1400" cy="326" r="3" fill="#2a1c12"/>' +
      // 공중에 멈춘 증기
      [
        [960, 60, 46],
        [1010, 40, 34],
        [1060, 64, 26],
        [1330, 150, 30],
        [1368, 132, 22],
      ]
        .map(
          (q) =>
            '<circle cx="' +
            q[0] +
            '" cy="' +
            q[1] +
            '" r="' +
            q[2] +
            '" fill="#cfd8e0" opacity=".07"/>',
        )
        .join('') +
      // 석탄 더미와 삽
      '<path d="M1006 726q16 -46 58 -42q28 -30 62 2q24 6 30 40Z" fill="#070706"/><path d="M1030 706l16 -10l14 8M1084 692l18 -8l12 10M1112 712l14 -6" fill="none" stroke="#3a3d3a" stroke-width="3" stroke-linecap="round"/><path d="M1150 724l-34 -150" stroke="#5a3320" stroke-width="9" stroke-linecap="round"/><path d="M1100 566h30l6 18h-42Z" fill="#5a3320"/><path d="M1136 724h30l8 -34h-46Z" fill="#6d7570"/>' +
      // 공구 상자
      '<rect x="110" y="672" width="170" height="54" rx="5" fill="#5a1f1f"/><rect x="110" y="672" width="170" height="12" rx="5" fill="#7a2a2c"/><path d="M170 672q0 -22 25 -22q25 0 25 22" fill="none" stroke="#2a160d" stroke-width="6"/><rect x="186" y="690" width="18" height="14" rx="2" fill="url(#gBrass)"/></g>' +
      // 작업대와 시계
      '<rect x="1160" y="560" width="300" height="20" fill="#5a3320"/><rect x="1180" y="580" width="16" height="146" fill="#3b2115"/><rect x="1424" y="580" width="16" height="146" fill="#3b2115"/>' +
      '<g class="hot" data-id="bench" tabindex="0" role="button" aria-label="작업대 위 회중시계 케이스"><path d="M1226 560l20 -16h130l20 16Z" fill="#6b1d1f"/><circle cx="1310" cy="516" r="40" fill="url(#gBrass)"/><circle cx="1310" cy="516" r="31" fill="' +
      (S.flags.fixed ? '#efe2c4' : '#120c09') +
      '"/>' +
      (S.flags.fixed
        ? '<line x1="1310" y1="516" x2="1310" y2="494" stroke="#2a1c12" stroke-width="3"/><line x1="1310" y1="516" x2="1307" y2="490" stroke="#2a1c12" stroke-width="2"/><circle cx="1310" cy="516" r="60" fill="url(#gLamp)"/>'
        : '<circle cx="1310" cy="516" r="22" fill="none" stroke="#6e4a1c" stroke-dasharray="3 4"/>') +
      '<circle cx="1310" cy="470" r="8" fill="none" stroke="url(#gBrass)" stroke-width="4"/></g>' +
      // 출발 레버
      '<g class="hot" data-id="lever" tabindex="0" role="button" aria-label="출발 레버"><rect x="1490" y="300" width="70" height="330" rx="10" fill="#0b0b0a" stroke="#3d4a3c" stroke-width="6"/><rect x="1518" y="330" width="14" height="270" rx="7" fill="#232b22"/><g class="lvh"><rect x="1519" y="352" width="12" height="52" fill="#8d9a86"/><rect x="1470" y="340" width="110" height="26" rx="13" fill="' +
      (S.flags.given ? '#e0362c' : '#5a2420') +
      '"/>' +
      (S.flags.given ? '<circle cx="1525" cy="353" r="90" fill="url(#gLamp)"/>' : '') +
      '</g><text x="1525" y="290" text-anchor="middle" font-size="19" font-weight="800" fill="' +
      (S.flags.given ? '#f0cf7e' : '#6e6a55') +
      '">출발</text></g>' +
      shards(77, 30) +
      '</svg>',
  };
  // 객차 정보 (이름·부제·목표)
  const CARS = {
    4: {
      n: '4호차',
      kind: '객실칸',
      sub: '멈춰버린 시간',
      goal: '열차에 무슨 일이 생겼는지 확인하고 3호차로 이동하기',
    },
    3: {
      n: '3호차',
      kind: '식당칸',
      sub: '두 사람의 추억',
      goal: '두 사람의 관계를 알아내고 두 번째 시계 부품 찾기',
    },
    2: {
      n: '2호차',
      kind: '객실칸',
      sub: '돌아오지 않는 사람',
      goal: '윤정에게 무슨 일이 있었는지, 기관사가 왜 슬퍼하는지 알아내기',
    },
    1: {
      n: '1호차',
      kind: '승무원칸',
      sub: '마지막 운행의 진실',
      goal: '기관사가 슬퍼한 이유를 알아내고 마지막 편지 찾기',
    },
    0: {
      n: '기관실',
      kind: '운전실',
      sub: '다시 흐르는 시간',
      goal: '회중시계를 고치고, 멈춘 열차를 다시 출발시키기',
    },
  };
  const ORDER = [4, 3, 2, 1, 0];
  // 퍼즐 완료 여부 확인 함수 만들기
  const F = (k) => () => !!S.flags[k];
  /* 칸마다 살펴볼 곳: lock은 퍼즐, clue는 단서 수첩에 기록, look은 그냥 보기, door는 다음 칸 */
  const SPOTS = {
    4: [
      { id: 'clock', label: '벽시계', type: 'lock', done: F('clock') },
      { id: 'suitcase', label: '보관함 속 여행가방', type: 'lock', done: F('case4') },
      { id: 'news', label: '남자가 읽던 신문', type: 'clue' },
      { id: 'clapper', label: '박수치던 승객', type: 'look' },
      { id: 'couple', label: '멈춘 부부', type: 'look' },
      { id: 'passenger', label: '멈춘 승객', type: 'clue' },
      { id: 'window', label: '창밖', type: 'look' },
      {
        id: 'door',
        label: '3호차 연결문',
        type: 'door',
        done: () => !!(S.flags.clock && S.flags.case4),
      },
    ],
    3: [
      { id: 'register', label: '금전등록기', type: 'lock', done: F('reg') },
      { id: 'musicbox', label: '추억의 오르골', type: 'lock', done: F('mbox') },
      { id: 'menu', label: '메뉴판', type: 'clue' },
      { id: 'receipt', label: '식탁 위 영수증', type: 'clue' },
      { id: 'diners', label: '식사하던 연인', type: 'look' },
      {
        id: 'door',
        label: '2호차 연결문',
        type: 'door',
        done: () => !!(S.flags.reg && S.flags.mbox),
      },
    ],
    2: [
      { id: 'trunk', label: '낡은 트렁크', type: 'lock', done: F('trunk') },
      { id: 'starbox', label: '별이 새겨진 상자', type: 'lock', done: F('sbox') },
      { id: 'calendar', label: '벽 달력', type: 'clue' },
      { id: 'book', label: '그림책', type: 'clue' },
      { id: 'child', label: '잠든 아이', type: 'look' },
      { id: 'reserved', label: '예약석', type: 'look' },
      { id: 'stars', label: '창밖의 별자리', type: 'clue' },
      {
        id: 'door',
        label: '1호차 연결문',
        type: 'door',
        done: () => !!(S.flags.trunk && S.flags.sbox),
      },
    ],
    1: [
      { id: 'cabinet', label: '기록 보관함', type: 'lock', done: F('cab') },
      { id: 'locker', label: '물품 보관함', type: 'lock', done: F('letter') },
      { id: 'door', label: '기관실 연결문', type: 'lock', done: F('cabdoor') },
      { id: 'notice', label: '운행 안내문', type: 'clue' },
      { id: 'plaque', label: '문 옆 명판', type: 'clue' },
      { id: 'farewell', label: '은퇴 축하 자리', type: 'look' },
      { id: 'clock1', label: '멈춘 벽시계', type: 'look' },
    ],
    0: [
      { id: 'bench', label: '회중시계 고치기', type: 'lock', done: F('fixed') },
      { id: 'engineer', label: '한시원 기관사', type: 'lock', done: F('given') },
      { id: 'gauges', label: '계기판', type: 'look' },
      { id: 'lever', label: '출발 레버', type: 'door', done: F('given') },
    ],
  };
  // 물건 정보 찾기
  const meta = (c, id) => SPOTS[c].find((m) => m.id === id);
  // 해당 칸의 퍼즐 목록
  const locksOf = (c) => SPOTS[c].filter((m) => m.type === 'lock');
  // 해당 칸의 퍼즐을 모두 풀었는지 확인
  const carDone = (c) => locksOf(c).every((m) => m.done());
  // 물건의 상태(퍼즐·풀림·봄) 구하기
  function spotState(c, m) {
    if (m.type === 'lock') return m.done() ? 'solved' : 'lock';
    if (m.type === 'door' && m.done()) return 'solved';
    return S.seen[c + ':' + m.id] ? 'seen' : '';
  }
  // 물건을 눌렀을 때 처리 (소리·단서 기록·동작 실행)
  function openSpot(c, id) {
    const m = meta(c, id);
    if (!m) return;
    if ($('#game').classList.contains('busy') && c === S.car) return;
    A.init();
    const k = c + ':' + id;
    S.seen[k] = 1;
    if (m.type === 'clue') A.paper();
    else if (m.type === 'look') A.tap();
    if (m.type === 'clue' && !S.notes.includes(k)) {
      S.notes.push(k);
      setTimeout(() => toast('단서 수첩에 기록 · ' + m.label), 50);
    }
    curLabel = m.label;
    const f = ON[c] && ON[c][id];
    if (f) f();
    if (c === S.car && $('#game').classList.contains('on')) renderSpots();
    renderSide();
  }
  // 현재 객차 화면 전체 다시 그리기
  function render() {
    const c = CARS[S.car];
    $('#eyebrow').textContent = c.n + ' · ' + c.kind;
    $('#ctitle').textContent = c.sub;
    $('#goal').textContent = c.goal;
    $('#train').innerHTML = ORDER.map((k, i) => {
      const C = CARS[k],
        open = k >= S.reached;
      return (
        (i ? '<span class="coupler" aria-hidden="true"></span>' : '') +
        '<button type="button" class="car' +
        (k === 0 ? ' engine' : '') +
        (k === S.car ? ' current' : '') +
        (open ? ' lit' : '') +
        (open && carDone(k) ? ' done' : '') +
        '" data-car="' +
        k +
        '"' +
        (open ? '' : ' disabled') +
        ' aria-current="' +
        (k === S.car) +
        '"><b>' +
        C.n +
        '</b><span>' +
        (open ? C.kind : '잠김') +
        '</span></button>'
      );
    }).join('');
    $('#sceneWrap').dataset.car = String(S.car);
    $('#scene').innerHTML = SCENES[S.car]();
    renderSpots();
    renderSide();
  }
  // 아래 선택지 버튼과 퍼즐 진행 표시 다시 그리기
  function renderSpots() {
    const L = locksOf(S.car),
      lc = $('#lockcount');
    lc.innerHTML =
      '퍼즐 ' + L.map((m) => '<i class="' + (m.done() ? 'on' : '') + '"></i>').join('');
    lc.setAttribute(
      'aria-label',
      '이 칸의 퍼즐 ' + L.filter((m) => m.done()).length + ' / ' + L.length + '개 풀림',
    );
    $('#spots').innerHTML = SPOTS[S.car]
      .map(
        (m) =>
          '<button type="button" class="chip ' +
          (m.type === 'lock' ? 'puz ' : '') +
          spotState(S.car, m) +
          '" data-spot="' +
          m.id +
          '"><span class="k" aria-hidden="true"></span>' +
          m.label +
          '</button>',
      )
      .join('');
    $('#next').innerHTML =
      carDone(S.car) && S.car !== 0
        ? '<button class="btn" type="button" data-go="' +
          (S.car - 1) +
          '">문이 열렸다 · ' +
          CARS[S.car - 1].n +
          '(으)로 이동 ▶</button>'
        : '';
  }
  /* 객차에 들어와 소개가 끝날 때까지는 물건·선택지를 누를 수 없다 */
  let busyRun = 0;
  // 객차 소개 중 클릭 막기/풀기
  function setBusy(on) {
    $('#game').classList.toggle('busy', on);
  }
  // 객차 들어가기 (문 소리 → 제목 카드 → 소개)
  async function enterCar(c) {
    const run = ++busyRun;
    setBusy(true);
    if (S.started && S.car !== c) A.door();
    S.car = c;
    S.reached = Math.min(S.reached, c);
    closeModal();
    render();
    {
      const sc = $('#scene');
      sc.classList.remove('enter');
      void sc.offsetWidth;
      sc.classList.add('enter');
    }
    try {
      $('#game').scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    } catch (e) {}
    const k = $('#card');
    k.firstElementChild.textContent = CARS[c].n;
    k.lastElementChild.textContent = CARS[c].sub;
    k.classList.add('show');
    say(
      {
        4: '객실 안의 모든 것이 멈춰 있다. 눈에 띄는 것을 눌러 살펴보자.',
        3: '식당칸이다. 식탁 위에 누군가의 흔적이 남아 있다.',
        2: '조명이 꺼진 객실. 창밖으로 별이 또렷하게 보인다.',
        1: '승무원이 쓰는 칸이다. 기관실로 이어지는 철문이 보인다.',
        0: '기관실. 기관사가 창밖을 바라본 채 멈춰 있다.',
      }[c],
    );
    setTimeout(() => k.classList.remove('show'), REDUCED ? 900 : 2200);
    await new Promise((r) => setTimeout(r, REDUCED ? 900 : 2300));
    if (c === 4 && !S.flags.woke) {
      S.flags.woke = 1;
      await speak([
        '눈을 뜬다. 열차가 멈춰 있다.<br>박수를 치던 사람들도, 창밖의 빗방울도 그대로 굳어 있다.',
        '주머니가 묵직하다.<br>꺼내 보니 속이 텅 빈 회중시계 케이스가 들어 있다.',
        '멈춘 열차 안에서 움직일 수 있는 사람은 나뿐이다.<br>아마도, 이 케이스 때문에.',
      ]);
      addItem('case');
      // 얻자마자 케이스를 바로 보여 준다
      showItem('case', 1);
    }
    if (run === busyRun) setBusy(false);
  }
  // 인트로가 끝나고 게임 화면 시작
  function startGame() {
    FX.mode = 'off';
    cx.clearRect(0, 0, W, H);
    S.started = true;
    show('game');
    enterCar(S.car);
  }
  let leverBusy = false;
  // 잠긴 문을 눌렀을 때의 반응
  const locked = () => {
    A.locked();
    const w = $('#sceneWrap');
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
    say('문이 움직이지 않는다. 이 객실에서 아직 풀지 못한 것이 남아 있다.');
  };

  /* 단서가 아닌 물건: 짧은 설명을 팝업으로 보여 준다 */
  let curLabel = '';
  // 단서가 아닌 물건의 설명 팝업 열기
  function look(t) {
    openModal({ k: '살펴보기', title: curLabel, html: '<p>' + t + '</p>' });
  }
  // 물건을 눌렀을 때의 동작 (객차별)
  const ON = {
    // 4호차 물건별 동작
    4: {
      window() {
        look('창밖의 빗방울이 공중에 멈춰 있다. 떨어지지도, 흐르지도 않는다.');
      },
      passenger() {
        openModal({
          k: '단서',
          title: '멈춘 승객',
          html: '<p>박수를 치던 승객. 두 손이 맞닿기 직전에 그대로 굳어 있다. 숨소리도 들리지 않는다.</p><p>손목시계의 바늘은 <b>11시 59분</b>에 멈춰 있다. 초침도 움직이지 않는다.</p>',
        });
      },
      clapper() {
        look(
          '활짝 웃으며 박수를 치던 승객. 두 손바닥 사이에 한 뼘의 틈을 남긴 채 그대로 멈춰 있다.',
        );
      },
      couple() {
        look(
          '신문을 읽던 남편과 커피를 마시던 아내. 찻잔에서 피어오르던 김마저 공중에 그대로 멈춰 있다.',
        );
      },
      news() {
        openModal({
          k: '단서',
          title: '남자가 읽던 신문',
          html: '<div class="news"><p class="dl">2026년 12월 31일 목요일</p><h4>40년의 운행, 오늘 마지막 열차를 달리다</h4><p><b>한시원 기관사, 오늘 밤 마지막 운행</b></p><p>1963년 개통한 새벽선의 야간열차를 40년 동안 몰아 온 한시원 기관사가 오늘 마지막 운행을 마친다. 1985년 견습 기관사로 철도에 들어온 그는 이듬해 처음으로 직접 열차를 몰았고, 2026년 12월 31일을 끝으로 은퇴한다.</p><p>철도 관계자는 “오랜 세월 승객들의 안전을 위해 헌신한 기관사에게 감사드린다”고 전했다.</p></div><p class="pencil">“모든 여정에는 시작과 끝이 있다.”</p>',
        });
      },
      clock() {
        if (S.flags.clock)
          return look('벽시계는 11시 59분을 가리킨 채 멈춰 있다. 아래 칸은 이미 열려 있다.');
        puzzle({
          title: '벽시계',
          desc: '바늘이 빠져 있는 벽시계. 추 아래 작은 칸이 잠겨 있고, 숫자판 네 개가 달려 있다.',
          hint: '마지막 순간을 기억하라.',
          n: 4,
          answer: '1159',
          wrong: '칸은 꿈쩍도 하지 않는다.',
          ok() {
            S.flags.clock = 1;
            render();
            addItem('diary1');
            say('벽시계 아래 칸이 열리고, 낡은 일기장이 나왔다.');
            showItem('diary1', 1);
          },
        });
      },
      suitcase() {
        if (S.flags.case4) return look('여행가방은 열려 있다. 안에는 더 이상 아무것도 없다.');
        puzzle({
          title: '여행가방',
          desc: '낡은 가죽 여행가방. 네 자리 자물쇠로 잠겨 있다. 손잡이에 “한시원”이라는 이름표가 달려 있다.',
          hint: '그가 처음으로 직접 열차를 몬 해. 신문을 다시 읽어 보자.',
          n: 4,
          answer: '1986',
          ok() {
            S.flags.case4 = 1;
            render();
            addItem('spring');
            say(
              '가방 안쪽 주머니에서 금빛 태엽과 일기 한 장이 나왔다. 3호차로 가는 문에서 딸깍 소리가 난다.',
            );
            gotPart('spring');
          },
        });
      },
      door() {
        S.flags.clock && S.flags.case4 ? enterCar(3) : locked();
      },
    },
    // 3호차 물건별 동작
    3: {
      diners() {
        look(
          '포크와 찻잔을 든 채 멈춘 두 사람. 마주 보며 웃던 얼굴 그대로다. 오래전 이 식당칸에서 처음 마주 앉았던 누군가도 이런 표정이었을까.',
        );
      },
      menu() {
        openModal({
          k: '단서',
          title: '메뉴판',
          html: '<div class="menu"><div><span>커피</span><span>2,500원</span></div><div><span>조각 케이크</span><span>4,000원</span></div><div><span>홍차</span><span>3,000원</span></div></div>',
        });
      },
      receipt() {
        openModal({
          k: '단서',
          title: '식탁 위의 영수증',
          html: '<div class="rcpt"><p style="text-align:center;margin:0 0 8px">새벽 식당칸<br>1985. 4.</p><div><span>커피</span><span>× 2</span></div><div><span>조각 케이크</span><span>× 1</span></div><p style="margin:10px 0 0;border-top:1px dashed #2a1c12;padding-top:6px">합계 ……</p></div><p>오래된 영수증이다. 끝부분이 찢겨 나갔다. 두 사람이 마주 앉았던 자리 같다.</p>',
        });
      },
      register() {
        if (S.flags.reg) return look('금전등록기 서랍은 열려 있다. 표시창에 9000이 떠 있다.');
        puzzle({
          title: '금전등록기',
          desc: '오래된 금전등록기. 네 자리 숫자를 누르는 자판이 달려 있다.',
          hint: '그날 두 사람이 먹은 것의 값. 메뉴판과 영수증을 함께 보자.',
          n: 4,
          answer: '9000',
          btn: '계산하기',
          wrong: '땡. 금액이 맞지 않는다.',
          ok() {
            S.flags.reg = 1;
            render();
            addItem('photo');
            say('서랍이 열리고, 지폐 대신 사진 한 장이 들어 있다. 뒷면에 글씨가 보인다.');
            showItem('photo', 1);
          },
        });
      },
      musicbox() {
        if (S.flags.mbox)
          return look(
            '오르골은 열려 있다. 멜로디는 한 음에서 멈춘 채 울리지 않는다. 뚜껑 안쪽에는 일기 한 장이 끼워져 있던 자국이 남아 있다.',
          );
        const b = openModal({
          k: '퍼즐',
          title: '추억의 오르골',
          html:
            '<p>뚜껑이 잠긴 오르골. 색이 다른 버튼 네 개가 달려 있다. 정해진 순서대로 눌러야 열릴 것 같다.</p><div class="hint"><b>힌트</b>' +
            (has('photo')
              ? '사진 뒷면에 적힌 물건의 순서, 그리고 앞면에서 그 물건들의 색.'
              : '순서를 알려 줄 단서가 아직 없다. 이 객실을 더 살펴보자.') +
            '</div><div class="mbox"></div><div class="dots"><i></i><i></i><i></i><i></i></div><p class="msg"></p>',
        });
        const seq = [],
          ans = 'ybrg',
          box = b.querySelector('.mbox'),
          dots = b.querySelectorAll('.dots i'),
          msg = b.querySelector('.msg');
        [
          ['r', '#c62f2b', '빨강', 392],
          ['g', '#3f9a56', '초록', 523],
          ['y', '#f2c230', '노랑', 330],
          ['b', '#2d5fa8', '파랑', 440],
        ].forEach((q) => {
          const bt = el('button');
          bt.type = 'button';
          bt.style.background = q[1];
          bt.setAttribute('aria-label', q[2] + ' 버튼');
          bt.id = 'mb-' + q[0];
          bt.onclick = () => {
            A.note(q[3]);
            seq.push(q[0]);
            dots.forEach((d, i) => d.classList.toggle('on', i < seq.length));
            msg.textContent = '';
            if (seq.length === 4) {
              if (seq.join('') === ans) {
                [330, 440, 392, 523, 659, 523, 659, 784].forEach((f, i) =>
                  A.note(f, 0.5 + i * 0.22),
                );
                S.flags.mbox = 1;
                setTimeout(() => {
                  closeModal();
                  render();
                  addItem('gear');
                  say(
                    '오르골이 열리며 짧은 멜로디가 흐르다 멈춘다. 안에서 톱니바퀴와, 접힌 일기 한 장이 나왔다.',
                  );
                  gotPart('gear');
                }, 700);
              } else {
                A.bad();
                seq.length = 0;
                setTimeout(() => dots.forEach((d) => d.classList.remove('on')), 300);
                msg.textContent = '오르골은 열리지 않는다. 순서가 다르다.';
                box.classList.remove('shake');
                void box.offsetWidth;
                box.classList.add('shake');
              }
            }
          };
          box.append(bt);
        });
      },
      door() {
        S.flags.reg && S.flags.mbox ? enterCar(2) : locked();
      },
    },
    // 2호차 물건별 동작
    2: {
      reserved() {
        look(
          '좌석에 낡은 “예약석” 표가 붙어 있고, 노란 우산 하나가 기대어 있다. 표 귀퉁이에 “윤정”이라는 이름이 흐릿하게 남아 있다. 수십 년째 아무도 앉지 않은 자리 같다.',
        );
      },
      child() {
        look('그림책을 읽다 잠든 아이. 작은 손가락이 마지막 장의 낙서 위에 얹혀 있다.');
      },
      calendar() {
        const mk = { 2: '점검', 14: 'U', 21: '교대', 27: '정비' };
        let g =
          '<div class="mcal"><div class="h">3월</div>' +
          '일월화수목금토'
            .split('')
            .map((d) => '<span class="w">' + d + '</span>')
            .join('') +
          '<span></span>'.repeat(6);
        for (let d = 1; d <= 31; d++) {
          const m = mk[d];
          g +=
            '<span class="' +
            (m ? 'o' : '') +
            '">' +
            d +
            (m === 'U'
              ? '<svg viewBox="0 0 40 40" width="18" height="18" aria-label="노란 우산 그림">' +
                umb('#f2c230') +
                '</svg>'
              : m
                ? '<small>' + m + '</small>'
                : '') +
            '</span>';
        }
        openModal({
          k: '단서',
          title: '벽 달력',
          html:
            g +
            '</div><p style="margin-top:12px">3월에서 넘어가지 않은 달력. 날짜 몇 개에 붉은 동그라미가 쳐 있다. 한 칸에만 글씨 대신 작은 그림이 그려져 있다.</p>',
        });
      },
      trunk() {
        if (S.flags.trunk) return look('트렁크는 열려 있다. 일기장이 있던 자리만 남아 있다.');
        puzzle({
          title: '낡은 트렁크',
          desc: '좌석 아래 밀어 넣어 둔 트렁크. 네 자리 자물쇠가 달려 있다. 오랫동안 아무도 열지 않은 것 같다.',
          hint: '잊을 수 없는 날. 그녀를 떠올리게 하는 것이 그려진 날짜.',
          n: 4,
          answer: '0314',
          ok() {
            S.flags.trunk = 1;
            render();
            addItem('diary3');
            say('트렁크 안에서 기관사의 일기가 나왔다.');
            showItem('diary3', 1);
          },
        });
      },
      book() {
        openModal({
          k: '단서',
          title: '그림책',
          wide: 1,
          html: '<div class="book"><div><p><b>별 세는 밤</b></p><p>창밖의 별자리마다 별이 몇 개씩 모여 있는지 세어 보세요.</p></div><div><p style="font-size:13px;color:#7a5530">마지막 장, 아이의 낙서</p><p class="kid">“시간이 흘러야 별도 움직이고, 새로운 별도 볼 수 있대요!”</p></div></div>',
        });
      },
      stars() {
        openModal({
          k: '살펴보기',
          title: '창밖의 별자리',
          wide: 1,
          html:
            '<div class="starview"><svg viewBox="0 0 780 260">' +
            [0, 1, 2]
              .map(
                (i) => '<g transform="translate(' + (i * 260 + 5) + ' 0)">' + starWin(i) + '</g>',
              )
              .join('') +
            '</svg></div><p style="margin-top:12px">세 개의 창에 별자리가 하나씩 걸려 있다. 별들도 제자리에 멈춰 있다.</p>',
        });
      },
      starbox() {
        if (S.flags.sbox) return look('놋쇠 상자는 열려 있다.');
        puzzle({
          title: '별이 새겨진 놋쇠 상자',
          desc: '뚜껑에 별 세 개가 새겨진 작은 상자. 세 자리 자물쇠로 잠겨 있다.',
          hint: '그림책의 말대로 별을 세어, 왼쪽 창부터 읽어 보자.',
          n: 3,
          answer: '463',
          ok() {
            S.flags.sbox = 1;
            render();
            addItem('hand');
            say('상자 안에 시계바늘이 가지런히 놓여 있다. 그 아래 일기 한 장이 깔려 있다.');
            gotPart('hand');
          },
        });
      },
      door() {
        S.flags.trunk && S.flags.sbox ? enterCar(1) : locked();
      },
    },
    // 1호차 물건별 동작
    1: {
      farewell() {
        look(
          '승무원들이 몰래 준비한 은퇴 축하 자리. 창 아래에 “감사합니다” 종이 띠가 걸려 있고, 벤치에는 기관사에게 씌워 줄 새 모자와 따뜻한 보온병이 놓여 있다. 축하는 시작도 못 한 채 멈췄다.',
        );
      },
      clock1() {
        look(
          '11시 59분에 멈춘 벽시계. 이 열차의 시계는 모두 같은 시각에서 멈췄다. 자정까지, 꼭 1분을 남겨 두고.',
        );
      },
      notice() {
        openModal({
          k: '단서',
          title: '운행 안내문',
          html: '<div class="news"><h4>운행 안내</h4><p>오늘 밤 이 열차는 한시원 기관사의 <b>마지막 운행</b>입니다.</p><p>종착역: 새벽역 · 도착 예정 24:00</p><p>40년간의 운행 기록은 기록 보관함에 보관되어 있습니다.</p></div>',
        });
      },
      plaque() {
        openModal({
          k: '단서',
          title: '문 옆 명판',
          html: '<p><b>기관실</b> · 관계자 외 출입 금지</p><p>문에는 날짜를 맞추는 달력식 잠금장치가 달려 있다.</p><p class="pencil">“여정이 끝난 다음 장에서 이 문이 열린다.”</p>',
        });
      },
      cabinet() {
        if (S.flags.cab) return look('기록 보관함은 비어 있다.');
        puzzle({
          title: '기록 보관함',
          desc: '운행 기록이 들어 있는 철제 보관함. 네 자리 자물쇠 옆에 ‘마지막 장’이라는 글귀가 새겨져 있다.',
          hint: '마지막 운행은 언제였을까. 이 열차의 다른 칸에 그 날짜가 적혀 있었다.',
          n: 4,
          answer: '1231',
          ok() {
            S.flags.cab = 1;
            render();
            addItem('diary4');
            addItem('glass');
            say('보관함에서 마지막 일기와 유리조각이 나왔다.');
            gotPart('glass');
          },
        });
      },
      locker() {
        if (S.flags.letter) return look('물품 보관함에는 주인을 기다리는 물건들만 남아 있다.');
        const shapes = {
          umb: (c) => umb(c),
          star: (c) =>
            '<path transform="translate(20 20) scale(1.4)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="' +
            c +
            '"/>',
          moon: (c) => '<path d="M26 6A15 15 0 1 0 34 30A12 12 0 1 1 26 6Z" fill="' + c + '"/>',
          heart: (c) =>
            '<path d="M20 34L6 19Q2 8 12 7Q18 7 20 13Q22 7 28 7Q38 8 34 19Z" fill="' + c + '"/>',
          train: (c) =>
            '<rect x="6" y="12" width="28" height="16" rx="3" fill="' +
            c +
            '"/><circle cx="12" cy="31" r="4" fill="#2a1c12"/><circle cx="28" cy="31" r="4" fill="#2a1c12"/><rect x="10" y="15" width="8" height="6" fill="#fff"/>',
          flower: (c) =>
            [0, 72, 144, 216, 288]
              .map(
                (a) =>
                  '<circle cx="20" cy="11" r="6" fill="' +
                  c +
                  '" transform="rotate(' +
                  a +
                  ' 20 20)"/>',
              )
              .join('') + '<circle cx="20" cy="20" r="4" fill="#f2c230"/>',
        };
        const L = [
          ['umb', '#c62f2b', '빨간 우산이 그려진 엽서.', '새벽역 역무실'],
          ['star', '#f2c230', '별이 그려진 봉투. 아이 글씨다.', '기관사 할아버지께'],
          ['train', '#6b1d1f', '기차 스티커가 붙은 소포 꼬리표.', '4호차 7번 좌석 손님'],
          ['umb', '#f2c230', '노란 우산이 그려진 엽서.', '한시운'],
          ['flower', '#d77aa0', '꽃이 그려진 축하 카드.', '김도윤 차장'],
          ['umb', '#2d5fa8', '파란 우산이 그려진 편지.', '분실물 센터'],
          ['heart', '#c62f2b', '하트가 그려진 쪽지.', '(비어 있음)'],
          ['umb', '#f2c230', '노란 우산이 그려진 편지. 단단히 봉인되어 있다.', '한시원', 1],
          ['umb', '#f2c230', '노란 우산이 그려진 봉투.', '새벽역 역장'],
          ['star', '#2d5fa8', '파란 별 도장이 찍힌 봉투.', '윤정'],
          ['train', '#1e5557', '초록 기차가 그려진 승차권 봉투.', '한시원 기관사 귀하 (반송)'],
          ['moon', '#cfd8e8', '은빛 달이 그려진 초대장.', '기관실 승무원 일동'],
        ];
        const b = openModal({
          k: '퍼즐',
          title: '물품 보관함',
          wide: 1,
          html: '<p>주인을 찾지 못한 편지와 엽서가 잔뜩 쌓여 있다. 그 사이 깊숙이, 기관사가 넣어 두고 꺼내지 못한 것이 있을지도 모른다.</p><div class="hint"><b>힌트</b>일기 속 그녀는 늘 무엇을 쓰고 있었나. 그리고 받는 사람의 이름을 정확히.</div><div class="lost" style="margin-top:14px"></div><p class="msg"></p>',
        });
        const g = b.querySelector('.lost'),
          msg = b.querySelector('.msg');
        L.forEach((q, i) => {
          const bt = el(
            'button',
            '',
            '<svg viewBox="0 0 80 60"><rect x="2" y="2" width="76" height="56" fill="#fffdf6" stroke="#8d7a5c"/><path d="M2 2L40 30L78 2" fill="none" stroke="#c9bfa6"/><g transform="translate(44 22) scale(.8)">' +
              shapes[q[0]](q[1]) +
              '</g><path d="M8 40h26M8 48h18" stroke="#8d7a5c" stroke-width="2"/></svg>',
          );
          bt.type = 'button';
          bt.id = 'lost' + i;
          bt.setAttribute('aria-label', '우편물 ' + (i + 1));
          bt.onclick = () => {
            A.tick();
            g.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === bt));
            msg.innerHTML =
              q[2] +
              '<br>받는 사람: <b>' +
              q[3] +
              '</b><br><button class="btn" type="button" id="take" style="margin-top:8px">이 편지를 챙긴다</button>';
            msg.querySelector('#take').onclick = () => {
              if (q[4]) {
                A.ok();
                S.flags.letter = 1;
                closeModal();
                render();
                addItem('letter');
                say(
                  '노란 우산이 그려진 편지. 겉봉에 “한시원에게”라고 적혀 있다. 소인은 3월 13일, 그녀가 떠나기 전날이다.',
                );
                showItem('letter', 1);
              } else {
                A.bad();
                msg.textContent = '이 편지는 아닌 것 같다. 다시 찾아보자.';
              }
            };
          };
          g.append(bt);
        });
      },
      door() {
        if (S.flags.cabdoor) return enterCar(0);
        if (!(S.flags.cab && S.flags.letter)) {
          A.locked();
          return say('기관실로 가기 전에, 이 객실에서 찾아야 할 것이 아직 남아 있다.');
        }
        let y = 2026,
          m = 12;
        const b = openModal({
          k: '퍼즐',
          title: '기관사 연결문',
          html: '<p>철문에 달력식 잠금장치가 달려 있다. 날짜 하나를 고르면 문이 반응한다.</p><div class="hint"><b>힌트</b>4호차 신문 귀퉁이의 연필 글씨를 떠올려 보자. 끝이 있으면, 그다음이 있다.</div><div class="cal" style="margin-top:14px"><header><button type="button" id="calp" aria-label="이전 달">‹</button><span id="calt"></span><button type="button" id="caln" aria-label="다음 달">›</button></header><div class="g"></div></div><p class="msg"></p>',
        });
        const g = b.querySelector('.g'),
          msg = b.querySelector('.msg');
        const draw = () => {
          b.querySelector('#calt').textContent = y + '년 ' + m + '월';
          g.innerHTML = '';
          '일월화수목금토'.split('').forEach((d) => g.append(el('span', '', d)));
          const first = new Date(y, m - 1, 1).getDay(),
            days = new Date(y, m, 0).getDate();
          for (let i = 0; i < first; i++) g.append(el('span', '', ''));
          for (let d = 1; d <= days; d++) {
            const bt = el('button', y === 2026 && m === 12 && d === 31 ? 'mk' : '', String(d));
            bt.type = 'button';
            bt.id = 'day' + d;
            bt.onclick = () => {
              if (m === 1 && d === 1 && y === 2027) {
                A.ok();
                S.flags.cabdoor = 1;
                closeModal();
                render();
                say('1월 1일. 잠금장치가 풀리고, 철문 너머로 불빛이 새어 나온다.');
                setTimeout(() => enterCar(0), 1400);
              } else {
                A.bad();
                msg.textContent =
                  m === 12 && d === 31 && y === 2026
                    ? '12월 31일. 문은 이미 이 날짜에 멈춰 있다.'
                    : '문은 움직이지 않는다. 이 날이 아니다.';
              }
            };
            g.append(bt);
          }
          // 달마다 주 수가 달라도 항상 6줄을 채워 팝업 높이를 고정한다
          for (let i = first + days; i < 42; i++) g.append(el('span', '', ''));
        };
        b.querySelector('#calp').onclick = () => {
          if (y === 2026 && m === 1) return;
          m--;
          if (m < 1) {
            m = 12;
            y--;
          }
          A.tick();
          draw();
        };
        b.querySelector('#caln').onclick = () => {
          if (y === 2027 && m === 12) return;
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
          A.tick();
          draw();
        };
        draw();
      },
    },
    // 기관실 물건별 동작
    0: {
      gauges() {
        look('압력계의 바늘이 모두 제자리에 멈춰 있다. 화실의 불꽃도 흔들리지 않는다.');
      },
      bench() {
        if (S.flags.fixed)
          return look('회중시계가 작업대 위에서 조용히 빛나고 있다. 초침은 아직 움직이지 않는다.');
        const placed = {},
          names = { spring: '태엽', gear: '톱니바퀴', hand: '시계바늘', glass: '유리조각' };
        const b = openModal({
          k: '최종 퍼즐',
          title: '회중시계 고치기',
          wide: 1,
          html: '<p>빈 케이스를 작업대에 올려놓았다. 모아 온 부품을 눌러 제자리에 끼워 넣자.</p><div class="bench"><div class="w"></div><div class="tray"></div></div><p class="msg"></p>',
        });
        const w = b.querySelector('.w'),
          tray = b.querySelector('.tray'),
          msg = b.querySelector('.msg');
        const draw = () => {
          w.innerHTML = watchSVG({
            spring: placed.spring,
            gear: placed.gear,
            hand: placed.hand,
            glass: placed.glass,
          });
        };
        draw();
        ['spring', 'gear', 'hand', 'glass'].forEach((id) => {
          const bt = el('button', '', IC[id] + '<span>' + names[id] + '</span>');
          bt.type = 'button';
          bt.id = 'part-' + id;
          bt.onclick = () => {
            if (id === 'hand' && !(placed.spring && placed.gear)) {
              A.bad();
              return (msg.textContent =
                '바늘을 걸 축이 아직 돌지 않는다. 안쪽 부품부터 넣어야 한다.');
            }
            if (id === 'glass' && !placed.hand) {
              A.bad();
              return (msg.textContent = '유리는 맨 마지막에 덮어야 한다.');
            }
            placed[id] = 1;
            bt.disabled = true;
            A.tick();
            A.part(id);
            msg.textContent = names[id] + '을(를) 끼웠다.';
            draw();
            if (Object.keys(placed).length === 4) {
              S.flags.fixed = 1;
              setTimeout(() => {
                closeModal();
                render();
                openModal({
                  k: '회중시계',
                  title: '시계가 제 모습을 되찾았다',
                  html:
                    '<div style="width:200px;margin:0 auto 12px">' +
                    watchSVG() +
                    '</div><p>네 개의 부품이 모두 제자리를 찾았다. 그런데 초침은 아직 움직이지 않는다.</p><p style="text-align:center;font-weight:700;color:var(--maroon)">봉인된 편지를 기관사에게 전달하십시오.</p>',
                });
                say('봉인된 편지를 기관사에게 전달하십시오.');
              }, 900);
            }
          };
          tray.append(bt);
        });
      },
      engineer() {
        if (S.flags.given)
          return look('기관사의 손에 편지가 들려 있다. 이제 출발 레버를 당길 차례다.');
        if (!S.flags.fixed)
          return look(
            '한시원 기관사. 창밖을 바라본 채 멈춰 있다. 손에는 끊어진 시곗줄만 남아 있다.',
          );
        const b = openModal({
          k: '기관실',
          title: '한시원 기관사',
          html: '<p>창밖을 바라보는 기관사의 손이 반쯤 펴져 있다. 무언가를 놓친 사람의 손이다.</p><div class="acts"><button class="btn" type="button" id="give">봉인된 편지를 건넨다</button></div>',
        });
        b.querySelector('#give').onclick = async () => {
          closeModal();
          A.get();
          await speak(['편지가 그의 손에 닿는 순간, 봉인이 스르르 풀린다.']);
          A.bell();
          await speak(
            [
              '“시원 씨, 우리의 시간이 끝나는 건 아니에요.<br>우리가 함께했던 순간은 언제나 당신 안에 남아 있을 테니까요.”',
              '“이제 당신만을 위한 새로운 길을 걸어가 주세요.”',
            ],
            '윤정의 목소리',
          );
          await speak([
            '굳어 있던 기관사의 눈가에 눈물 한 방울이 맺힌다.<br>떨어지지 못한 채, 그 자리에 머문다.',
          ]);
          S.flags.given = 1;
          render();
          A.tick();
          setTimeout(() => A.tick(), 1000);
          await speak(['회중시계의 초침이 움직이기 시작한다.<br>출발 레버에 불이 들어온다.']);
          say('출발 레버가 활성화되었다. 레버를 당기자.');
        };
      },
      lever() {
        if (!S.flags.given) {
          A.locked();
          return say('레버가 굳어 있다. 시간이 멈춘 동안에는 움직이지 않는다.');
        }
        if (leverBusy) return;
        leverBusy = true;
        A.init();
        A.leverPull();
        const h = $('#scene .lvh');
        if (h) {
          h.style.transition = 'transform 1.1s cubic-bezier(.45,0,.3,1)';
          h.style.transform = 'translateY(212px)';
        }
        setTimeout(() => A.clunk(), 1100);
        setTimeout(() => {
          leverBusy = false;
          runEnding();
        }, 2000);
      },
    },
  };
  $('#scene').addEventListener('click', (e) => {
    const h = e.target.closest('.hot');
    if (!h) return;
    hideTag();
    openSpot(S.car, h.dataset.id);
  });
  $('#game').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.car !== undefined) {
      const k = +d.car;
      if (k >= S.reached && k !== S.car) {
        A.init();
        enterCar(k);
      }
      return;
    }
    if (d.go !== undefined) {
      A.init();
      enterCar(+d.go);
      return;
    }
    if (d.spot) openSpot(S.car, d.spot);
  });
  const tagEl = $('#tag'),
    wrapEl = $('#sceneWrap');
  // 물건 위에 이름표 띄우기
  function showTag(h) {
    const m = meta(S.car, h.dataset.id);
    if (!m) return;
    const r = h.getBoundingClientRect(),
      p = wrapEl.getBoundingClientRect();
    tagEl.textContent = m.label;
    const y = r.top - p.top - 8,
      below = y < 34;
    tagEl.classList.toggle('below', below);
    tagEl.style.left = clamp(r.left + r.width / 2 - p.left, 64, p.width - 64) + 'px';
    tagEl.style.top = (below ? Math.min(r.bottom - p.top + 8, p.height - 34) : y) + 'px';
    tagEl.classList.add('show');
  }
  // 이름표 숨기기
  function hideTag() {
    tagEl.classList.remove('show');
  }
  $('#scene').addEventListener('mouseover', (e) => {
    const h = e.target.closest('.hot');
    h ? showTag(h) : hideTag();
  });
  $('#scene').addEventListener('mouseleave', hideTag);
  $('#scene').addEventListener('focusin', (e) => {
    const h = e.target.closest('.hot');
    if (h && h.matches(':focus-visible')) showTag(h);
  });
  $('#scene').addEventListener('focusout', hideTag);
  $('#bSound').onclick = (e) => {
    A.init();
    A.setMute(!A.mute);
    e.currentTarget.setAttribute('aria-pressed', !A.mute);
    e.currentTarget.textContent = A.mute ? '소리 꺼짐' : '소리 켜짐';
  };
  $('#bReset').onclick = () => {
    const b = openModal({
      k: '처음부터',
      title: '처음부터 다시 탈까요?',
      html: '<p>지금까지 푼 퍼즐과 모은 단서, 소지품이 모두 사라집니다.</p><div class="acts"><button class="btn" type="button" id="cfYes">다시 시작</button><button class="btn ghost" type="button" id="cfNo">취소</button></div>',
    });
    b.querySelector('#cfYes').onclick = resetAll;
    b.querySelector('#cfNo').onclick = closeModal;
  };

  // 처음부터 다시 시작
  function resetAll() {
    endRun++;

    A.rumble(false);
    A.stopPiece(1.2);
    A.stopTheme(0.6);
    A.rain(false, 0.6);

    rainPref = true;
    setSnd(true);

    S = fresh();
    closeModal();

    $('#eend').classList.remove('on');
    $('#eline').innerHTML = '';
    setMode('title');
    show('title');
  }

  /* ═════════ 엔딩 ═════════ */
  let endRun = 0;

  // 엔딩 전체 진행 (정지 → 각성 → 자정 출발)
  async function runEnding() {
    const run = ++endRun;

    closeModal();
    show('ending');

    const ending = $('#ending');
    const ew = $('#ewatch');
    const ln = $('#eline');
    const ee = $('#eend');

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const alive = () => run === endRun && ending.classList.contains('on');

    /* 1. 완전히 멈춘 세상 */
    ending.dataset.phase = 'still';
    setMode('endStill');

    A.init();
    A.rain(false, 0.6);
    A.rumble(false);
    A.stopPiece(0.4);

    ee.classList.remove('on');
    ln.innerHTML = '';
    ln.style.opacity = 1;

    // 11시 59분 50초에서 시작
    ew.innerHTML = watchSVG({ s: 300 });
    ew.style.display = '';

    const sh = ew.querySelector('.sh');
    const mh = ew.querySelector('.mh');
    const hh = ew.querySelector('.hh');

    /* 내레이션 전환 함수 */
    const tell = async (html, duration) => {
      ln.style.opacity = 0;

      await sleep(600);
      if (!alive()) return;

      ln.innerHTML = html;
      ln.style.opacity = 1;

      await sleep(duration);
    };

    await tell(
      '출발 레버를 끝까지 내렸다.<br>' + '하지만 열차 안의 모든 것은 아직 멈춰 있다.',
      1900,
    );

    if (!alive()) return;

    /* 2. 초침이 다시 움직이기 시작 */
    const midnight = (async () => {
      for (let i = 1; i <= 10; i++) {
        await sleep(1000);
        if (!alive()) return;

        sh.setAttribute('transform', `rotate(${300 + i * 6})`);

        A.tick();

        // 첫 초침이 움직일 때 세상도 깨어난다
        if (i === 1) {
          ending.dataset.phase = 'waking';
          setMode('endWake');

          // 실제 빗소리도 서서히 시작
          A.rain(true, 1.5, 0.32);
        }

        // 11:59:59 -> 00:00:00
        if (i === 10) {
          mh.setAttribute('transform', 'rotate(360)');
          hh.setAttribute('transform', 'rotate(360)');

          A.bell();
          A.bell(1.6);
          A.bell(3.2);
        }
      }
    })();

    await tell('똑.<br>' + '회중시계의 초침이 한 칸 움직였다.', 3000);

    if (!alive()) return;

    await tell(
      '공중에 멈춰 있던 빗방울이 떨어지고,<br>' + '창밖의 별빛도 다시 움직이기 시작한다.',
      3200,
    );

    if (!alive()) return;

    // 자정에 도달할 때까지 기다린다
    await midnight;
    if (!alive()) return;

    /* 3. 자정, 다시 달리는 열차 */
    ending.dataset.phase = 'running';
    setMode('end');

    // 기적 소리, 바퀴 소리, 엔딩 음악
    A.whistle();
    A.rumble(true);
    A.piece();

    /* 시계는 엔딩 이후에도 계속 움직인다 */
    const keepClockMoving = async () => {
      let seconds = 0;

      while (alive()) {
        await sleep(1000);
        if (!alive()) return;

        seconds++;

        sh.setAttribute('transform', `rotate(${seconds * 6})`);

        mh.setAttribute('transform', `rotate(${seconds * 0.1})`);
      }
    };

    keepClockMoving();

    await tell('2027년 1월 1일, 0시 0분.<br>' + '열차가 다시 달린다.', 4300);

    if (!alive()) return;

    // 인트로에서 멈췄던 박수가 이어진다
    A.applause(3);
    await tell(
      '멈췄던 박수 소리가 객실에서 다시 이어진다.<br>' +
        '기관사의 눈에 맺혀 있던 눈물이 그제야 떨어진다.',
      4200,
    );

    if (!alive()) return;

    await tell(
      '“윤정 씨, 약속은 끝까지 지켰어요.<br>' +
        '이제 나도, 내 길을 가 볼게요.”' +
        '<small>한시원</small>',
      4800,
    );

    if (!alive()) return;

    await tell(
      '창밖의 별들이 천천히 자리를 옮긴다.<br>' + '밤하늘 너머로 새벽빛이 스며든다.',
      3800,
    );

    if (!alive()) return;

    await tell(
      '종착역, 새벽역.<br>' + '아무도 없는 승강장에, 그는 마지막으로 열차를 세운다.',
      4600,
    );

    if (!alive()) return;

    // 주인공의 마무리
    await tell(
      '주머니는 다시 가벼워졌다.<br>' + '승강장에 내리며, 나는 기관실 쪽을 한 번 돌아본다.',
      4400,
    );

    if (!alive()) return;

    await tell(
      '<span class="kid">' +
        '“시간이 흘러야 별도 움직이고,<br>' +
        '새로운 별도 볼 수 있대요!”' +
        '</span>' +
        '<small>2호차 그림책 마지막 장의 낙서</small>',
      5500,
    );

    if (!alive()) return;

    /* 4. 마지막 메시지 */
    ln.style.opacity = 0;
    await sleep(900);

    if (!alive()) return;

    ln.innerHTML = '';
    ee.classList.add('on');
  }
  $('#again').onclick = resetAll;

  /* ═════════ 시작 ═════════ */
  function start(d) {
    if (d && d.started && d.flags) {
      S = Object.assign(fresh(), d);
      startGame();
    }
  }

  try {
    if (window.claude && window.claude.hot) {
      window.claude.hot.snapshot(() => S);
      window.claude.hot.ready
        ? window.claude.hot.ready(start)
        : start(window.claude.hot.data || {});
    }
  } catch (e) {}

  window.__game = {
    S: () => S,
    skip: () => {
      skipFlag = true;
      if (cur) cur();
    },
  };
})();
