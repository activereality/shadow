import { IEncountersResponse, IPlayerData } from 'src/app/logs/logs.service';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

/**
 * Model WCL data for a given log
 */
export class LogSummary {
  public title: string;
  public owner: string;
  public url: string;
  public encounters: EncounterSummary[];
  public players: Array<{ id: number, name: string }>
  public enemies: {[id: number]: string};

  constructor(public id: string, data: IEncountersResponse) {
    this.title = data.title;
    this.owner = data.owner;
    this.url = `https://classic.warcraftlogs.com/reports/${id}`;

    this.encounters = data.fights
      .filter((fight) => {
        // only boss fights with a duration
        return (fight.boss > 0 || fight.originalBoss > 0) && fight.end_time > fight.start_time;
      })
      .map((fight) => new EncounterSummary(fight));

    // Only shadow priests
    this.players = data.friendlies
      .filter((f) => f.icon === 'Priest-Shadow')
      .map((f) => ({ id: f.id, name: f.name }));

    this.enemies = data.enemies
      .concat(data.enemyPets)
      .reduce((enemies, next) => {
        enemies[next.id] = next.name;
        return enemies;
      }, {} as {[id: number]: string});
  }

  getEncounter(id: number) {
    return this.encounters.find((e) => e.id === id);
  }

  getPlayer(id: number) {
    return this.players.find((p) => p.id === id);
  }

  getPlayerByName(name: string) {
    return this.players.find((p) => p.name === name);
  }

  getEnemy(id: number) {
    return this.enemies[id];
  }
}
