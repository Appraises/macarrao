import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bodies, Body, Composite, Engine, Events } from 'matter-js';
import { ChevronDown, LogIn, Pause, Play, RefreshCw, Trophy, X } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';
import { trackAnalyticsEvent } from '../../src/lib/analytics';
import {
  getBrickBreakerLeaderboard,
  startBrickBreakerRun,
  submitBrickBreakerScore,
} from '../../src/services/api';
import type { KonamiControlSource } from '../../src/hooks/useKonamiTrigger';
import type { BrickBreakerLeaderboardResponse } from '../../types';
import {
  clampPaddleX,
  hasBallPassedPaddle,
  launchVelocity,
  levelForDestroyedBricks,
  normalizedBallVelocity,
  paddleBounceVelocity,
  scoreForBrick,
  STARTING_LIVES,
} from '../../src/game/brickBreaker/engine';
import {
  BRICK_COUNT,
  computeBrickBreakerLayout,
  type BrickBreakerLayout,
} from '../../src/game/brickBreaker/layout';

type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'LOST';

const DEFAULT_PALETTE = ['#0ea5e9', '#256d8f', '#334d68', '#42566f', '#1d7191', '#64748b'];

const scoreRange = (score: number) => {
  if (score < 5_000) return '0-4999';
  if (score < 20_000) return '5000-19999';
  if (score < 50_000) return '20000-49999';
  return '50000+';
};

const durationRange = (durationMs: number) => {
  if (durationMs < 60_000) return 'under_1m';
  if (durationMs < 300_000) return '1m-5m';
  if (durationMs < 900_000) return '5m-15m';
  return '15m+';
};

const useViewportLayout = () => {
  const read = () => computeBrickBreakerLayout(
    window.innerWidth,
    Math.max(420, window.innerHeight - 96),
  );
  const [layout, setLayout] = useState<BrickBreakerLayout>(read);

  useEffect(() => {
    const onResize = () => setLayout(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return layout;
};

const Leaderboard: React.FC<{
  data: BrickBreakerLeaderboardResponse | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  compact?: boolean;
}> = ({ data, loading, error, onRetry, compact = false }) => (
  <section className="border border-white/10 bg-dark-950/90 shadow-2xl backdrop-blur-md" aria-labelledby="brick-ranking">
    <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
      <h2 id="brick-ranking" className="flex items-center gap-2 text-[10px] font-bold uppercase text-white">
        <Trophy className="h-3.5 w-3.5 text-brand-400" /> Placar geral
      </h2>
      {data && <span className="text-[9px] uppercase text-gray-600">{data.totalPlayers} jogadores</span>}
    </div>
    {loading ? (
      <div className="space-y-1.5 p-3">
        {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
          <div key={index} className="h-8 animate-pulse bg-white/[0.04]" />
        ))}
      </div>
    ) : error ? (
      <div className="p-4 text-center">
        <p className="text-xs text-gray-500">Placar temporariamente indisponível.</p>
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-bold text-brand-400">
          Tentar novamente
        </button>
      </div>
    ) : data?.items.length ? (
      <>
        <ol className={compact ? 'max-h-32 overflow-y-auto' : 'max-h-[330px] overflow-y-auto'}>
          {data.items.slice(0, compact ? 5 : 20).map((entry) => (
            <li key={entry.user.id}>
              <Link
                to={`/u/${entry.user.id}`}
                className={`grid grid-cols-[24px_1fr_auto] items-center gap-2 border-b border-white/[0.05] px-3 py-2 hover:bg-white/[0.04] ${
                  data.me?.user.id === entry.user.id ? 'bg-brand-500/10' : ''
                }`}
              >
                <span className={`font-mono text-[10px] font-bold ${entry.rank <= 3 ? 'text-brand-400' : 'text-gray-600'}`}>
                  {entry.rank}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-gray-200">{entry.user.name}</span>
                  <span className="block text-[9px] text-gray-600">{entry.bricksDestroyed} tijolos · nv. {entry.level}</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-white">{entry.score.toLocaleString('pt-BR')}</span>
              </Link>
            </li>
          ))}
        </ol>
        {data.me && data.me.rank > (compact ? 5 : 20) && (
          <div className="grid grid-cols-[24px_1fr_auto] items-center gap-2 border-t border-brand-500/20 bg-brand-500/10 px-3 py-2.5">
            <span className="font-mono text-[10px] font-bold text-brand-400">{data.me.rank}</span>
            <span className="truncate text-[11px] font-semibold text-gray-200">Sua posição</span>
            <span className="font-mono text-[11px] font-bold text-white">{data.me.score.toLocaleString('pt-BR')}</span>
          </div>
        )}
      </>
    ) : (
      <p className="p-5 text-center text-xs text-gray-500">O primeiro recorde ainda está em aberto.</p>
    )}
  </section>
);

export const BrickBreaker: React.FC<{
  onClose: () => void;
  controlSource: KonamiControlSource;
  palette: string[];
}> = ({ onClose, controlSource, palette }) => {
  const { user } = useAuth();
  const layout = useViewportLayout();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const paddleRef = useRef<Body | null>(null);
  const ballRef = useRef<Body | null>(null);
  const brickBodiesRef = useRef<Body[]>([]);
  const statusRef = useRef<GameStatus>('READY');
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(STARTING_LIVES);
  const destroyedRef = useRef(0);
  const launchedRef = useRef(false);
  const runningRef = useRef(true);
  const runStartedRef = useRef(false);
  const runTokenRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const activeDurationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const pressedRef = useRef(new Set<string>());
  const pendingLaunchRef = useRef(false);
  const ballTrailRef = useRef<Array<{ x: number; y: number }>>([]);

  const [status, setStatusState] = useState<GameStatus>('READY');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [bricksDestroyed, setBricksDestroyed] = useState(0);
  const [gameVersion, setGameVersion] = useState(0);
  const [leaderboard, setLeaderboard] = useState<BrickBreakerLeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [scoreMessage, setScoreMessage] = useState('');
  const [mobileRankingOpen, setMobileRankingOpen] = useState(false);

  const colors = useMemo(() => {
    const usable = palette.filter(Boolean);
    return usable.length > 0 ? usable : DEFAULT_PALETTE;
  }, [palette]);

  const setStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    try {
      setLeaderboard(await getBrickBreakerLeaderboard());
    } catch {
      setLeaderboardError(true);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
    rootRef.current?.focus({ preventScroll: true });
  }, [loadLeaderboard]);

  const acquireRun = useCallback(async () => {
    runTokenRef.current = null;
    if (!user) return;
    try {
      const session = await startBrickBreakerRun();
      runTokenRef.current = session.runToken;
    } catch {
      setScoreMessage('A partida continua, mas este resultado não poderá ser enviado ao placar.');
    }
  }, [user]);

  const markGameStarted = useCallback(() => {
    if (runStartedRef.current) return;
    runStartedRef.current = true;
    activeDurationRef.current = 0;
    submittedRef.current = false;
    void acquireRun();
    trackAnalyticsEvent('Arcade Game Started', {
      game: 'brick_breaker',
      source: controlSource,
      authenticated: Boolean(user),
    });
  }, [acquireRun, controlSource, user]);

  const launchBall = useCallback(() => {
    const ball = ballRef.current;
    if (!ball || statusRef.current === 'LOST') return;
    if (statusRef.current === 'PAUSED') {
      setStatus('PLAYING');
      return;
    }
    if (launchedRef.current) return;
    markGameStarted();
    launchedRef.current = true;
    Body.setStatic(ball, false);
    const velocity = launchVelocity(levelRef.current, Math.random() > 0.5 ? 1 : -1);
    Body.setVelocity(ball, velocity);
    setStatus('PLAYING');
  }, [markGameStarted, setStatus]);

  const resetRound = useCallback((autoLaunch: boolean) => {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    if (!paddle || !ball) return;
    const paddleX = layout.field.x + layout.field.width / 2;
    Body.setPosition(paddle, { x: paddleX, y: layout.paddle.y + layout.paddle.height / 2 });
    Body.setVelocity(paddle, { x: 0, y: 0 });
    Body.setStatic(ball, true);
    Body.setPosition(ball, { x: paddleX, y: layout.paddle.y - layout.ballRadius - 5 });
    Body.setVelocity(ball, { x: 0, y: 0 });
    launchedRef.current = false;
    ballTrailRef.current = [];
    if (autoLaunch) window.setTimeout(() => {
      if (statusRef.current === 'PLAYING') launchBall();
    }, 700);
  }, [launchBall, layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(layout.width * dpr);
    canvas.height = Math.round(layout.height * dpr);
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;
    const wallThickness = 80;
    const wallOptions = { isStatic: true, restitution: 1, friction: 0, label: 'wall' };
    const walls = [
      Bodies.rectangle(layout.field.x - wallThickness / 2, layout.field.y + layout.field.height / 2, wallThickness, layout.field.height + wallThickness * 2, wallOptions),
      Bodies.rectangle(layout.field.x + layout.field.width + wallThickness / 2, layout.field.y + layout.field.height / 2, wallThickness, layout.field.height + wallThickness * 2, wallOptions),
      Bodies.rectangle(layout.field.x + layout.field.width / 2, layout.field.y - wallThickness / 2, layout.field.width + wallThickness * 2, wallThickness, wallOptions),
    ];
    const paddle = Bodies.rectangle(
      layout.paddle.x + layout.paddle.width / 2,
      layout.paddle.y + layout.paddle.height / 2,
      layout.paddle.width,
      layout.paddle.height,
      { isStatic: true, restitution: 1.08, friction: 0, label: 'paddle', chamfer: { radius: 6 } },
    );
    const ball = Bodies.circle(
      layout.paddle.x + layout.paddle.width / 2,
      layout.paddle.y - layout.ballRadius - 5,
      layout.ballRadius,
      { isStatic: true, restitution: 1, friction: 0, frictionAir: 0, inertia: Infinity, label: 'ball' },
    );
    paddleRef.current = paddle;
    ballRef.current = ball;

    const createBricks = () => {
      const bodies = layout.bricks.map((rect, index) => {
        const brick = Bodies.rectangle(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          rect.width,
          rect.height,
          {
            isStatic: true,
            restitution: 1,
            friction: 0,
            label: `brick:${index}`,
            chamfer: { radius: 2 },
          },
        );
        brick.plugin.arcadeColor = colors[index % colors.length];
        return brick;
      });
      brickBodiesRef.current = bodies;
      Composite.add(engine.world, bodies);
    };

    Composite.add(engine.world, [...walls, paddle, ball]);
    createBricks();

    let pendingPaddleBounce = false;
    let pendingBrickHits: Array<{
      brick: Body;
      incoming: { x: number; y: number };
      horizontalDistance: number;
      verticalDistance: number;
    }> = [];

    const queueBrickHit = (hitBall: Body, hitBrick: Body) => {
      if (
        !Composite.get(engine.world, hitBrick.id, 'body')
        || pendingBrickHits.some((pending) => pending.brick.id === hitBrick.id)
      ) return;
      const brickWidth = hitBrick.bounds.max.x - hitBrick.bounds.min.x;
      const brickHeight = hitBrick.bounds.max.y - hitBrick.bounds.min.y;
      pendingBrickHits.push({
        brick: hitBrick,
        incoming: { ...hitBall.velocity },
        horizontalDistance: (hitBall.position.x - hitBrick.position.x) / Math.max(1, brickWidth / 2),
        verticalDistance: (hitBall.position.y - hitBrick.position.y) / Math.max(1, brickHeight / 2),
      });
    };

    const onCollision = (event: { pairs: Array<{ bodyA: Body; bodyB: Body }> }) => {
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        const hitBall = bodies.find((body) => body.label === 'ball');
        const hitPaddle = bodies.find((body) => body.label === 'paddle');
        const hitBrick = bodies.find((body) => body.label.startsWith('brick:'));

        if (hitBall && hitPaddle) {
          pendingPaddleBounce = true;
        }

        if (hitBall && hitBrick) queueBrickHit(hitBall, hitBrick);
      }
    };
    Events.on(engine, 'collisionStart', onCollision);
    Events.on(engine, 'collisionActive', onCollision);

    const bounceFromPaddle = () => {
      Body.setPosition(ball, {
        x: ball.position.x,
        y: paddle.bounds.min.y - layout.ballRadius - 1,
      });
      Body.setVelocity(ball, paddleBounceVelocity(
        ball.position.x,
        paddle.position.x,
        layout.paddle.width,
        levelRef.current,
      ));
      pendingPaddleBounce = false;
    };

    const resolveBrickHits = () => {
      if (pendingBrickHits.length === 0) return;
      const hits = pendingBrickHits;
      pendingBrickHits = [];
      const rebound = hits[0];

      for (const hit of hits) {
        if (!Composite.get(engine.world, hit.brick.id, 'body')) continue;
        Composite.remove(engine.world, hit.brick);
        brickBodiesRef.current = brickBodiesRef.current.filter((body) => body.id !== hit.brick.id);

        destroyedRef.current += 1;
        scoreRef.current += scoreForBrick(levelRef.current);
      }

      setBricksDestroyed(destroyedRef.current);
      setScore(scoreRef.current);

      if (rebound) {
        const hitHorizontalSide = Math.abs(rebound.horizontalDistance) > Math.abs(rebound.verticalDistance);
        const horizontalDirection = rebound.incoming.x > 0
          ? -1
          : rebound.incoming.x < 0
            ? 1
            : rebound.horizontalDistance < 0 ? -1 : 1;
        const verticalDirection = rebound.incoming.y > 0
          ? -1
          : rebound.incoming.y < 0
            ? 1
            : rebound.verticalDistance < 0 ? -1 : 1;
        const bounced = hitHorizontalSide
          ? {
              x: horizontalDirection * Math.max(3.2, Math.abs(rebound.incoming.x)),
              y: rebound.incoming.y,
            }
          : {
              x: rebound.incoming.x,
              y: verticalDirection * Math.max(4.2, Math.abs(rebound.incoming.y)),
            };
        const separatedPosition = hitHorizontalSide
          ? {
              x: horizontalDirection < 0
                ? rebound.brick.bounds.min.x - layout.ballRadius - 1
                : rebound.brick.bounds.max.x + layout.ballRadius + 1,
              y: ball.position.y,
            }
          : {
              x: ball.position.x,
              y: verticalDirection < 0
                ? rebound.brick.bounds.min.y - layout.ballRadius - 1
                : rebound.brick.bounds.max.y + layout.ballRadius + 1,
            };
        Body.setPosition(ball, {
          x: separatedPosition.x,
          y: separatedPosition.y,
        });
        Body.setVelocity(ball, normalizedBallVelocity(bounced.x, bounced.y, levelRef.current));
      }

      if (destroyedRef.current > 0 && destroyedRef.current % BRICK_COUNT === 0) {
        const nextLevel = levelForDestroyedBricks(destroyedRef.current);
        levelRef.current = nextLevel;
        setLevel(nextLevel);
        Body.setStatic(ball, true);
        launchedRef.current = false;
        pendingBrickHits = [];
        window.setTimeout(() => {
          if (!runningRef.current || statusRef.current === 'LOST') return;
          createBricks();
          resetRound(true);
        }, 520);
      }
    };

    let animationFrame = 0;
    let lastFrame = performance.now();
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
    };

    const render = (now: number) => {
      if (!runningRef.current) return;
      const delta = Math.min(24, now - lastFrame);
      lastFrame = now;

      if (statusRef.current === 'PLAYING') {
        const previousBallBottom = ball.position.y + layout.ballRadius;
        Engine.update(engine, delta);
        activeDurationRef.current += delta;

        // Matter can report a long-lived overlap instead of a fresh collision
        // after a neighboring brick is removed. Detect circle/AABB penetration
        // explicitly so every visible brick remains solid.
        for (const brick of brickBodiesRef.current) {
          const nearestX = Math.max(brick.bounds.min.x, Math.min(ball.position.x, brick.bounds.max.x));
          const nearestY = Math.max(brick.bounds.min.y, Math.min(ball.position.y, brick.bounds.max.y));
          const dx = ball.position.x - nearestX;
          const dy = ball.position.y - nearestY;
          if (dx * dx + dy * dy <= layout.ballRadius * layout.ballRadius) {
            queueBrickHit(ball, brick);
          }
        }
        resolveBrickHits();

        const paddleStep = Math.max(7, layout.field.width * 0.012);
        if (pressedRef.current.has('arrowleft') || pressedRef.current.has('a')) {
          const x = clampPaddleX(paddle.position.x - paddleStep, layout.field.x, layout.field.width, layout.paddle.width);
          Body.setPosition(paddle, { x, y: paddle.position.y });
        }
        if (pressedRef.current.has('arrowright') || pressedRef.current.has('d')) {
          const x = clampPaddleX(paddle.position.x + paddleStep, layout.field.x, layout.field.width, layout.paddle.width);
          Body.setPosition(paddle, { x, y: paddle.position.y });
        }

        if (!launchedRef.current) {
          Body.setPosition(ball, { x: paddle.position.x, y: layout.paddle.y - layout.ballRadius - 5 });
        } else {
          const finiteBall = Number.isFinite(ball.position.x)
            && Number.isFinite(ball.position.y)
            && Number.isFinite(ball.velocity.x)
            && Number.isFinite(ball.velocity.y);
          if (!finiteBall) {
            resetRound(true);
          }

          const leftBoundary = layout.field.x + layout.ballRadius;
          const rightBoundary = layout.field.x + layout.field.width - layout.ballRadius;
          const topBoundary = layout.field.y + layout.ballRadius;
          if (ball.position.x < leftBoundary) {
            Body.setPosition(ball, { x: leftBoundary, y: ball.position.y });
            Body.setVelocity(ball, { x: Math.abs(ball.velocity.x), y: ball.velocity.y });
          } else if (ball.position.x > rightBoundary) {
            Body.setPosition(ball, { x: rightBoundary, y: ball.position.y });
            Body.setVelocity(ball, { x: -Math.abs(ball.velocity.x), y: ball.velocity.y });
          }
          if (ball.position.y < topBoundary) {
            Body.setPosition(ball, { x: ball.position.x, y: topBoundary });
            Body.setVelocity(ball, { x: ball.velocity.x, y: Math.abs(ball.velocity.y) });
          }

          const paddleTop = paddle.bounds.min.y;
          const crossedPaddle = previousBallBottom <= paddleTop + 3
            && ball.position.y + layout.ballRadius >= paddleTop;
          const overlapsPaddle = ball.position.x + layout.ballRadius >= paddle.bounds.min.x
            && ball.position.x - layout.ballRadius <= paddle.bounds.max.x;
          if (
            pendingPaddleBounce
            || (ball.velocity.y > 0 && crossedPaddle && overlapsPaddle)
          ) {
            bounceFromPaddle();
          }

          const corrected = normalizedBallVelocity(ball.velocity.x, ball.velocity.y, levelRef.current);
          Body.setVelocity(ball, corrected);
          ballTrailRef.current = [
            { x: ball.position.x, y: ball.position.y },
            ...ballTrailRef.current,
          ].slice(0, 8);
          if (hasBallPassedPaddle(ball.position.y - layout.ballRadius, paddle.bounds.max.y)) {
            const nextLives = livesRef.current - 1;
            livesRef.current = nextLives;
            setLives(nextLives);
            pendingPaddleBounce = false;
            pendingBrickHits = [];
            if (nextLives <= 0) {
              setStatus('LOST');
            } else {
              resetRound(true);
            }
          }
        }
      }

      context.clearRect(0, 0, layout.width, layout.height);
      canvas.dataset.ballX = String(ball.position.x);
      canvas.dataset.ballY = String(ball.position.y);
      canvas.dataset.ballVelocityY = String(ball.velocity.y);
      context.save();
      context.strokeStyle = 'rgba(148, 163, 184, .16)';
      context.lineWidth = 1;
      context.setLineDash([4, 7]);
      context.strokeRect(layout.field.x + 0.5, layout.field.y + 0.5, layout.field.width - 1, layout.field.height - 1);
      context.setLineDash([]);

      for (const brick of brickBodiesRef.current) {
        const width = brick.bounds.max.x - brick.bounds.min.x;
        const height = brick.bounds.max.y - brick.bounds.min.y;
        const color = String(brick.plugin.arcadeColor || DEFAULT_PALETTE[0]);
        drawRoundedRect(brick.bounds.min.x + 1, brick.bounds.min.y + 1, width - 2, height - 2, 2);
        context.fillStyle = color;
        context.globalAlpha = 0.88;
        context.fill();
        context.globalAlpha = 1;
        context.strokeStyle = 'rgba(255,255,255,.22)';
        context.stroke();
        context.fillStyle = 'rgba(255,255,255,.09)';
        context.fillRect(brick.bounds.min.x + 4, brick.bounds.min.y + 4, Math.max(0, width - 8), 2);
      }

      drawRoundedRect(
        paddle.bounds.min.x,
        paddle.bounds.min.y,
        paddle.bounds.max.x - paddle.bounds.min.x,
        paddle.bounds.max.y - paddle.bounds.min.y,
        6,
      );
      context.fillStyle = '#20b8e6';
      context.shadowColor = 'rgba(14,165,233,.8)';
      context.shadowBlur = 16;
      context.fill();
      context.shadowBlur = 0;

      ballTrailRef.current.slice(1).forEach((point, index, trail) => {
        context.beginPath();
        context.arc(point.x, point.y, Math.max(2, layout.ballRadius * (1 - (index + 1) / (trail.length + 2))), 0, Math.PI * 2);
        context.fillStyle = `rgba(56, 189, 248, ${Math.max(0.04, 0.22 - index * 0.025)})`;
        context.fill();
      });

      context.beginPath();
      context.arc(ball.position.x, ball.position.y, layout.ballRadius, 0, Math.PI * 2);
      context.fillStyle = '#f8fafc';
      context.shadowColor = 'rgba(255,255,255,.8)';
      context.shadowBlur = 18;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = 'rgba(56,189,248,.85)';
      context.stroke();
      context.restore();

      animationFrame = window.requestAnimationFrame(render);
    };

    runningRef.current = true;
    animationFrame = window.requestAnimationFrame(render);
    if (pendingLaunchRef.current) {
      pendingLaunchRef.current = false;
      window.setTimeout(launchBall, 80);
    }

    return () => {
      runningRef.current = false;
      window.cancelAnimationFrame(animationFrame);
      Events.off(engine, 'collisionStart', onCollision);
      Events.off(engine, 'collisionActive', onCollision);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      engineRef.current = null;
      paddleRef.current = null;
      ballRef.current = null;
      brickBodiesRef.current = [];
    };
  }, [colors, gameVersion, launchBall, layout, resetRound, setStatus]);

  useEffect(() => {
    if (status !== 'LOST' || submittedRef.current) return;
    submittedRef.current = true;
    const durationMs = Math.max(1_000, Math.round(activeDurationRef.current));
    trackAnalyticsEvent('Arcade Game Over', {
      game: 'brick_breaker',
      score_range: scoreRange(score),
      duration_range: durationRange(durationMs),
      authenticated: Boolean(user),
    });
    const runToken = runTokenRef.current;
    if (!user || !runToken) return;

    void submitBrickBreakerScore({
      runToken,
      score,
      bricksDestroyed,
      level,
      durationMs,
    }).then((result) => {
      setScoreMessage(result.isPersonalBest ? 'Novo recorde pessoal salvo.' : 'Partida registrada. Seu recorde permanece.');
      trackAnalyticsEvent('Arcade Score Saved', {
        game: 'brick_breaker',
        personal_best: result.isPersonalBest,
        score_range: scoreRange(score),
      });
      void loadLeaderboard();
    }).catch((error) => {
      setScoreMessage(error?.response?.data?.error || 'Não foi possível salvar este resultado.');
    });
  }, [bricksDestroyed, level, loadLeaderboard, score, status, user]);

  const movePaddle = useCallback((clientX: number) => {
    const paddle = paddleRef.current;
    if (!paddle) return;
    const x = clampPaddleX(clientX, layout.field.x, layout.field.width, layout.paddle.width);
    Body.setPosition(paddle, { x, y: paddle.position.y });
    if (!launchedRef.current && ballRef.current) {
      Body.setPosition(ballRef.current, { x, y: layout.paddle.y - layout.ballRadius - 5 });
    }
  }, [layout]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'PLAYING') setStatus('PAUSED');
    else if (statusRef.current === 'PAUSED') setStatus('PLAYING');
  }, [setStatus]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = STARTING_LIVES;
    levelRef.current = 1;
    destroyedRef.current = 0;
    runStartedRef.current = false;
    runTokenRef.current = null;
    submittedRef.current = false;
    activeDurationRef.current = 0;
    setScore(0);
    setLives(STARTING_LIVES);
    setLevel(1);
    setBricksDestroyed(0);
    setScoreMessage('');
    setStatus('READY');
    pendingLaunchRef.current = true;
    setGameVersion((version) => version + 1);
  }, [setStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
        event.preventDefault();
        pressedRef.current.add(key);
      }
      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        if (statusRef.current === 'LOST') restart();
        else launchBall();
      }
      if (key === 'p') {
        event.preventDefault();
        togglePause();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => pressedRef.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [launchBall, onClose, restart, togglePause]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && statusRef.current === 'PLAYING') setStatus('PAUSED');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [setStatus]);

  const personalBest = leaderboard?.me?.score || 0;
  const sidebarLeft = layout.field.x + layout.field.width + 20;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      data-testid="brick-breaker"
      className="relative h-full w-full overflow-hidden text-gray-200 outline-none"
      onPointerMove={(event) => movePaddle(event.clientX)}
      onPointerDown={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('button, a')) return;
        movePaddle(event.clientX);
        if (event.pointerType === 'touch' || event.button === 0) launchBall();
      }}
    >
      <canvas
        ref={canvasRef}
        data-brick-palette={colors.join('|')}
        className="absolute inset-0 touch-none"
        aria-label="Área de jogo do Brick Breaker"
      />

      <div
        className="pointer-events-none absolute top-3 flex items-center gap-4 border-y border-white/10 bg-dark-950/75 px-3 py-2 backdrop-blur-sm"
        style={{ left: layout.field.x, width: layout.field.width }}
      >
        <span className="ml-auto font-mono text-[10px] text-gray-400">
          <strong data-testid="brick-score" className="text-white">{score.toLocaleString('pt-BR')}</strong> pts
        </span>
        <span className="font-mono text-[10px] text-gray-400">vidas <strong data-testid="brick-lives" className="text-white">{lives}</strong></span>
        <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">nível <strong className="text-white">{level}</strong></span>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar Brick Breaker"
        title="Fechar"
        className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center border border-white/10 bg-dark-950/85 text-gray-400 backdrop-blur-sm hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <X className="h-5 w-5" />
      </button>

      {!layout.compact && (
        <aside className="absolute top-[66px] w-[min(272px,22vw)]" style={{ left: sidebarLeft }}>
          <Leaderboard data={leaderboard} loading={leaderboardLoading} error={leaderboardError} onRetry={loadLeaderboard} />
          <div className="mt-3 border border-white/10 bg-dark-950/85 p-3 text-[10px] text-gray-500 backdrop-blur-md">
            <div className="flex justify-between"><span>Seu melhor</span><strong className="font-mono text-gray-200">{personalBest.toLocaleString('pt-BR')}</strong></div>
            <div className="mt-1 flex justify-between"><span>Tijolos</span><strong className="font-mono text-gray-200">{bricksDestroyed}</strong></div>
            <p className="mt-3 border-t border-white/8 pt-3 leading-relaxed">Mouse ou A/D movem · Espaço lança · P pausa</p>
          </div>
          {!user && (
            <Link
              to="/login?returnTo=%2Fterm%2FJogo"
              onClick={() => {
                sessionStorage.setItem('dg:arcade:resume', 'true');
                onClose();
              }}
              className="mt-3 flex items-center gap-2 border border-brand-500/20 bg-dark-950/90 px-3 py-3 text-[11px] font-bold text-brand-400 backdrop-blur-md hover:border-brand-500/50"
            >
              <LogIn className="h-4 w-4" /> Entre para registrar seu recorde
            </Link>
          )}
          {scoreMessage && <p className="mt-3 text-[10px] leading-relaxed text-gray-400">{scoreMessage}</p>}
        </aside>
      )}

      {layout.compact && (
        <div className="absolute inset-x-3 top-12 z-20">
          <button
            type="button"
            onClick={() => setMobileRankingOpen((open) => !open)}
            className="ml-auto flex h-8 items-center gap-2 border border-white/10 bg-dark-950/90 px-2.5 text-[10px] font-bold uppercase text-gray-300 backdrop-blur-md"
            aria-expanded={mobileRankingOpen}
          >
            <Trophy className="h-3.5 w-3.5 text-brand-400" /> Placar
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileRankingOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileRankingOpen && (
            <div className="absolute right-0 top-9 w-[min(320px,calc(100vw-24px))]">
              <Leaderboard compact data={leaderboard} loading={leaderboardLoading} error={leaderboardError} onRetry={loadLeaderboard} />
            </div>
          )}
        </div>
      )}

      {(status === 'READY' || status === 'PAUSED' || status === 'LOST') && (
        <div
          className="absolute z-10 grid place-items-center text-center"
          style={{
            left: layout.field.x,
            top: layout.field.y,
            width: layout.field.width,
            height: layout.field.height,
          }}
        >
          <div className="max-w-xs bg-dark-950/78 px-6 py-5 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase text-brand-400">
              {status === 'READY' ? 'Painéis convertidos' : status === 'PAUSED' ? 'Partida pausada' : 'Fim de jogo'}
            </p>
            <h1 className="mt-1 text-xl font-black uppercase text-white">
              {status === 'LOST' ? `${score.toLocaleString('pt-BR')} pontos` : 'Quebre a página'}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              {status === 'READY'
                ? 'Os componentes viraram a parede. Mova a barra e lance a bola.'
                : status === 'PAUSED'
                  ? 'A página espera você voltar.'
                  : `${bricksDestroyed} tijolos destruídos no nível ${level}.`}
            </p>
            <button
              type="button"
              onClick={status === 'LOST' ? restart : status === 'PAUSED' ? togglePause : launchBall}
              className="mt-4 inline-flex h-10 items-center gap-2 border border-brand-400/40 bg-brand-500 px-4 text-xs font-black uppercase text-black hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              {status === 'LOST' ? <RefreshCw className="h-4 w-4" /> : status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {status === 'LOST' ? 'Jogar novamente' : status === 'PAUSED' ? 'Continuar' : 'Lançar'}
            </button>
          </div>
        </div>
      )}

      {status === 'PLAYING' && (
        <button
          type="button"
          onClick={togglePause}
          aria-label="Pausar partida"
          title="Pausar"
          className="absolute bottom-4 right-3 z-20 grid h-11 w-11 place-items-center border border-white/10 bg-dark-950/85 text-gray-300 backdrop-blur-sm hover:text-white"
        >
          <Pause className="h-4 w-4" />
        </button>
      )}

      {layout.compact && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between border border-white/10 bg-dark-950/85 px-3 py-2 backdrop-blur-md">
          <span className="text-[9px] leading-tight text-gray-500">Arraste para mover<br />toque para lançar</span>
          <span className="font-mono text-[10px] text-gray-300">{bricksDestroyed} tijolos</span>
          {!user && (
            <Link
              to="/login?returnTo=%2Fterm%2FJogo"
              onClick={() => {
                sessionStorage.setItem('dg:arcade:resume', 'true');
                onClose();
              }}
              className="text-[10px] font-bold text-brand-400"
            >
              Entrar
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
