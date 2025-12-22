/**
 * A deterministic pseudo-random number generator (PRNG) using the Mulberry32 algorithm.
 */
export class Random {
    private state: number

    constructor(seed: number | string) {
        this.state = typeof seed === 'string' ? this.hashString(seed) : seed
    }

    private hashString(str: string): number {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = (hash << 5) - hash + char
            hash |= 0
        }
        return hash
    }

    next(): number {
        let t = (this.state += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min
    }

    pick<T>(array: T[], weights?: number[]): T {
        if (!weights) {
            return array[this.nextInt(0, array.length - 1)]
        }
        const totalWeight = weights.reduce((a, b) => a + b, 0)
        let r = this.next() * totalWeight
        for (let i = 0; i < array.length; i++) {
            r -= weights[i] || 0
            if (r <= 0) return array[i]
        }
        return array[array.length - 1]
    }

    boolean(probability = 0.5): boolean {
        return this.next() < probability
    }
}
