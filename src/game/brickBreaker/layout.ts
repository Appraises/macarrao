export const BRICK_COLUMNS = 8;
export const BRICK_ROWS = 6;
export const BRICK_COUNT = BRICK_COLUMNS * BRICK_ROWS;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrickBreakerLayout {
  width: number;
  height: number;
  field: Rect;
  bricks: Rect[];
  paddle: Rect;
  ballRadius: number;
  compact: boolean;
}

export const computeBrickBreakerLayout = (width: number, height: number): BrickBreakerLayout => {
  const compact = width < 900;
  const horizontalPadding = compact ? 12 : 24;
  const sidebarWidth = compact ? 0 : Math.min(272, Math.max(224, width * 0.22));
  const gap = compact ? 0 : 20;
  const maximumFieldWidth = compact ? width - horizontalPadding * 2 : 820;
  const availableFieldWidth = width - horizontalPadding * 2 - sidebarWidth - gap;
  const fieldWidth = Math.max(280, Math.min(maximumFieldWidth, availableFieldWidth));
  const groupWidth = fieldWidth + sidebarWidth + gap;
  const fieldX = Math.max(horizontalPadding, (width - groupWidth) / 2);
  const fieldY = compact ? 84 : 66;
  const bottomSpace = compact ? 86 : 24;
  const fieldHeight = Math.max(340, height - fieldY - bottomSpace);
  const field = { x: fieldX, y: fieldY, width: fieldWidth, height: fieldHeight };

  const brickGap = Math.max(3, Math.min(7, fieldWidth * 0.008));
  const brickInset = compact ? 10 : 18;
  const brickWidth = (fieldWidth - brickInset * 2 - brickGap * (BRICK_COLUMNS - 1)) / BRICK_COLUMNS;
  const brickHeight = Math.max(18, Math.min(34, fieldHeight * 0.052));
  const bricksTop = fieldY + (compact ? 22 : 28);
  const bricks = Array.from({ length: BRICK_COUNT }, (_, index) => {
    const column = index % BRICK_COLUMNS;
    const row = Math.floor(index / BRICK_COLUMNS);
    return {
      x: fieldX + brickInset + column * (brickWidth + brickGap),
      y: bricksTop + row * (brickHeight + brickGap),
      width: brickWidth,
      height: brickHeight,
    };
  });

  const paddleWidth = Math.max(76, Math.min(128, fieldWidth * 0.18));
  const paddleHeight = compact ? 12 : 14;
  const paddle = {
    x: fieldX + (fieldWidth - paddleWidth) / 2,
    y: fieldY + fieldHeight - 34,
    width: paddleWidth,
    height: paddleHeight,
  };

  return {
    width,
    height,
    field,
    bricks,
    paddle,
    ballRadius: compact ? 8 : 10,
    compact,
  };
};
