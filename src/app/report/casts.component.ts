import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { FormControl } from '@angular/forms';

import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CastsComponent implements OnInit, OnChanges  {
  @Input() log: LogSummary;
  @Input() summary: CastsSummary;
  @Input() encounterId: number;
  @Input() targetId: number;
  @Input() spellId: SpellId;

  casts: CastDetails[];
  spellData: ISpellData;
  spellSummary: SpellSummary;
  encounter: EncounterSummary;
  highlight = new StatHighlights();
  spellFilter = new FormControl();
  spells: { id: string; name: string }[] = [];
  spellNames: { [id: string]: string };
  stats?: SpellStats;

  private allCasts: CastDetails[];

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.spellFilter.valueChanges.subscribe(() => {
      this.filterCasts();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.spellId) {
      this.spellId = SpellId.NONE;
    }

    this.encounter = this.log.getEncounter(this.encounterId) as EncounterSummary;
    let stats: SpellStats;

    if (this.spellId > SpellId.NONE) {
      this.spellData = SpellData[this.spellId];
      this.spellSummary = this.summary.getSpellSummary(this.spellId);
      stats = this.spellSummary;
    } else {
      stats = this.summary.stats;
    }

    this.stats = this.targetId ? stats.targetStats(this.targetId) : stats;
    this.allCasts = this.stats?.casts || [];


    if (this.spellId === SpellId.NONE) {
      this.spellNames = this.allCasts.reduce((lookup, cast) => {
        if (!lookup.hasOwnProperty(cast.spellId)) {
          lookup[cast.spellId] = cast.name;
        }
        return lookup;
      }, {} as {[id: string]: string});

      this.spells = Object.keys(this.spellNames)
        .map((spellId) => ({ id: spellId, name: this.spellNames[spellId] }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    this.filterCasts();
    this.changeDetectorRef.detectChanges();
  }

  get filterSpells() {
    return this.spellId === SpellId.NONE;
  }

  getSpellNames(spellIds: SpellId[]) {
    return spellIds.map((id) => this.spellNames[id]).join(', ');
  }

  duration(lengthMs: number, format = 'mm:ss.dd') {
    const offset = lengthMs/1000;

    const minutes = Math.floor(offset / 60),
      secondsFloat = offset - (minutes * 60),
      seconds = Math.floor(secondsFloat),
      decimal = Math.round((secondsFloat - seconds) * 100);

    const values: any = {
      M: minutes,
      mm: (minutes + '').padStart(2, '0'),
      S: seconds,
      ss: (seconds + '').padStart(2, '0'),
      dd: (decimal + '').padStart(2, '0').padEnd(2, '0')
    };

    let out = format;
    for (const key in values) {
      out = out.replace(key, values[key]);
    }

    return out;
  }

  format(value: number|undefined, decimals = 1, suffix = '') {
    if (value === undefined) {
      return '---';
    }

    const factor = 10 ** decimals;
    return (Math.round(value * factor) / factor) + suffix;
  }

  targetName(targetId: number, targetInstance: number) {
    return this.log.getActorName(targetId, targetInstance);
  }

  offsetTime(timestamp: number) {
    return this.duration(timestamp - this.encounter.start);
  }

  castTime(cast: CastDetails) {
    if (this.isChannel(cast) && cast.lastDamageTimestamp) {
      return this.duration(cast.lastDamageTimestamp - cast.castStart, 'S.dd');
    }

    return this.duration(cast.castEnd - cast.castStart, 'S.dd');
  }

  isDamage(cast: CastDetails) {
    return SpellData[cast.spellId].damageType !== DamageType.NONE;
  }

  isDot(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT;
  }

  isChannel(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL;
  }

  hasCooldown(cast: CastDetails) {
    return SpellData[cast.spellId].cooldown > 0;
  }

  expectHits(cast: CastDetails) {
    return ([DamageType.DOT, DamageType.CHANNEL, DamageType.AOE].includes(SpellData[cast.spellId].damageType));
  }

  maxHits(cast: CastDetails) {
    return ([DamageType.DOT, DamageType.CHANNEL].includes(SpellData[cast.spellId].damageType));
  }

  hits(cast: CastDetails) {
    const spellData = SpellData[cast.spellId];
    let hits = cast.hits.toString();

    if (this.maxHits(cast)) {
      return `${hits}/${spellData.maxDamageInstances}`;
    }

    return hits;
  }

  activeDps(stats: SpellStats) {
    return this.format((stats.totalDamage * 1000) / stats.activeDuration);
  }

  powerMetric(stats: SpellStats) {
    const duration = stats.activeDuration,
      dps = (stats.totalDamage * 1000) / duration;

    return this.format(dps / stats.avgSpellpower, 3);
  }

  iconClass(cast: CastDetails) {
    return {
      [`spell-${cast.spellId}`]: true
    };
  }

  filterCasts() {
    const filterValues = this.spellFilter.value;

    if (Array.isArray(filterValues) && filterValues.length > 0 && filterValues.length !== this.spells.length) {
      const spellIds = filterValues.map((v) => parseInt(v));
      this.casts = this.allCasts.filter((c) => spellIds.includes(c.spellId));
    } else {
      this.casts = this.allCasts;
    }
  }
}
