import { CastDetails } from 'src/app/report/cast-details';
import { SpellId, SpellData, ISpellData } from 'src/app/logs/spell-id.enum';

export class CastSummary {
  spellId: SpellId;
  spellData: ISpellData;
  casts: CastDetails[] = []

  private _totalDamage: number;
  private _successfulCasts: number;
  private _totalHits: number;
  private _avgHits: number;
  private _castsByHitCount: { [i: number]: number };
  private recalculate = false;

  constructor(spellId: SpellId) {
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get count() {
    return this.casts.length;
  }

  get totalDamage() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalDamage;
  }

  get successfulCasts() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._successfulCasts;
  }

  get totalHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalHits;
  }

  get avgHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgHits;
  }

  get castsByHitCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._castsByHitCount;
  }

  private calculate() {
    this._totalDamage = this.casts.reduce((sum, next) => {
        sum += next.totalDamage;
        return sum;
      }, 0);

    this._successfulCasts = this.casts.filter((c) => c.totalDamage > 0).length;

    this._totalHits = this.casts
      .filter((c) => c.totalDamage > 0)
      .reduce((sum, next) => {
        sum += (this.spellData.maxInstances > 1 ? next.ticks : 1);
        return sum;
      }, 0);

    if (this.spellData.maxInstances > 1) {
      this._avgHits = this._totalHits / this._successfulCasts;

      this._castsByHitCount = this.casts
        .filter((c) => c.totalDamage > 0)
        .reduce((cbt, next) => {
          if (cbt.hasOwnProperty(next.ticks)) {
            cbt[next.ticks]++;
          } else {
            cbt[next.ticks] = 1;
          }
          return cbt;
        }, {} as {[n: number]: number});
    } else {
      this._avgHits = 1;
      this._castsByHitCount = { [1]: this._successfulCasts };
    }

    this.recalculate = false;
  }
}