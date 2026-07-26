import { BRICK_COUNT } from './layout';

export const STARTING_LIVES = 3;

export const levelForDestroyedBricks = (bricksDestroyed: number) =>
  Math.floor(Math.max(0, bricksDestroyed) / BRICK_COUNT) + 1;

export const scoreForBrick = (level: number) => Math.max(1, level) * 100;

export const clampPaddleX = (
  requestedCenterX: number,
  fieldLeft: number,
  fieldWidth: number,
  paddleWidth: number,
) => {
  const half = paddleWidth / 2;
  return Math.min(fieldLeft + fieldWidth - half, Math.max(fieldLeft + half, requestedCenterX));
};

export const launchVelocity = (level: number, direction = 1) => {
  const speed = Math.min(13, 7.1 + Math.max(0, level - 1) * 0.55);
  return {
    x: speed * 0.46 * (direction < 0 ? -1 : 1),
    y: -speed * 0.89,
  };
};

export const normalizedBallVelocity = (x: number, y: number, level: number) => {
  const targetSpeed = Math.min(14, 7.3 + Math.max(0, level - 1) * 0.55);
  const currentSpeed = Math.hypot(x, y) || 1;
  let nextX = (x / currentSpeed) * targetSpeed;
  let nextY = (y / currentSpeed) * targetSpeed;
  const minimumVertical = targetSpeed * 0.42;

  if (Math.abs(nextY) < minimumVertical) {
    nextY = (nextY < 0 ? -1 : 1) * minimumVertical;
    const remainingX = Math.sqrt(Math.max(0, targetSpeed ** 2 - nextY ** 2));
    nextX = (nextX < 0 ? -1 : 1) * remainingX;
  }

  return { x: nextX, y: nextY };
};

export const paddleBounceVelocity = (
  ballCenterX: number,
  paddleCenterX: number,
  paddleWidth: number,
  level: number,
) => {
  const relative = (ballCenterX - paddleCenterX) / Math.max(1, paddleWidth / 2);
  const speed = Math.min(14, 7.3 + Math.max(0, level - 1) * 0.55);
  const x = Math.max(-0.92, Math.min(0.92, relative)) * speed * 0.82;
  return {
    x,
    y: -Math.sqrt(Math.max(8, speed ** 2 - x ** 2)),
  };
};

export const hasBallPassedPaddle = (ballTop: number, paddleBottom: number) =>
  ballTop > paddleBottom;
