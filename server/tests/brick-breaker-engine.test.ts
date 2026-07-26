import { describe, expect, it } from 'vitest';
import {
    clampPaddleX,
    hasBallPassedPaddle,
    launchVelocity,
    levelForDestroyedBricks,
    normalizedBallVelocity,
    paddleBounceVelocity,
    scoreForBrick
} from '../../src/game/brickBreaker/engine';
import { BRICK_COUNT, computeBrickBreakerLayout } from '../../src/game/brickBreaker/layout';

describe('Brick Breaker engine helpers', () => {
    it('creates a stable 8 by 6 wall inside the current viewport', () => {
        const layout = computeBrickBreakerLayout(1440, 804);
        expect(layout.bricks).toHaveLength(BRICK_COUNT);
        expect(layout.bricks[0].x).toBeGreaterThan(layout.field.x);
        expect(layout.bricks.at(-1)!.x + layout.bricks.at(-1)!.width).toBeLessThan(layout.field.x + layout.field.width);
    });

    it('keeps the paddle inside both walls', () => {
        expect(clampPaddleX(-100, 20, 400, 100)).toBe(70);
        expect(clampPaddleX(900, 20, 400, 100)).toBe(370);
        expect(clampPaddleX(200, 20, 400, 100)).toBe(200);
    });

    it('advances one level per complete component wall', () => {
        expect(levelForDestroyedBricks(0)).toBe(1);
        expect(levelForDestroyedBricks(47)).toBe(1);
        expect(levelForDestroyedBricks(48)).toBe(2);
        expect(scoreForBrick(3)).toBe(300);
    });

    it('launches upward and avoids nearly horizontal loops', () => {
        expect(launchVelocity(1).y).toBeLessThan(0);
        const velocity = normalizedBallVelocity(10, 0.01, 1);
        expect(Math.abs(velocity.y)).toBeGreaterThan(3);
        expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(7.3, 1);
    });

    it('rebounds upward from the paddle and loses a life only after passing below it', () => {
        const bounce = paddleBounceVelocity(240, 200, 100, 1);
        expect(bounce.x).toBeGreaterThan(0);
        expect(bounce.y).toBeLessThan(0);
        expect(hasBallPassedPaddle(499, 500)).toBe(false);
        expect(hasBallPassedPaddle(501, 500)).toBe(true);
    });
});
