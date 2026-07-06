import PlayerStatisticsService from '../services/playerStatistics';

describe('playerStatistics.getIntelStats', () => {
    let service: PlayerStatisticsService;

    beforeEach(() => {
        // @ts-ignore
        service = new PlayerStatisticsService(null, null, null, null, null, null);
    });

    it('should map ship kills and losses from statistics', () => {
        const stats: any = {
            combat: {
            kills: { ships: 12 },
            losses: { ships: 7 },
            },
            research: {
                scanning: 50,
                hyperspace: 100,
                terraforming: 0,
                experimentation: 10,
                weapons: 205,
                banking: 100,
                manufacturing: 100,
                specialists: 100,
            }
        };

        const result = service.getIntelStats(stats);

        expect(result.shipKills).toBe(12);
        expect(result.shipLosses).toBe(7);
    });

    it('undefined test - should default ship kills and losses to zero when statistics is missing for a player', () => {
        const result = service.getIntelStats(undefined);

        expect(result.shipKills).toBe(0);
        expect(result.shipLosses).toBe(0);
    });

    it('partial undefined test 1 - shouldnt crash if the data is wierd (shouldnt happen I think maybe weirdness or changes/renaming in the data source)', () => {
        const stats: any = {
            combat: {
            },
        };

        const result = service.getIntelStats(stats);

        expect(result.shipKills).toBe(0);
        expect(result.shipLosses).toBe(0);
    });

    it('partial undefined test 2- shouldnt crash if the data is weird (shouldnt happen I think maybe weirdness or changes/renaming in the data source)', () => {
        const stats: any = {
            combat: {
            kills: {}
            },
        };

        const result = service.getIntelStats(stats);

        expect(result.shipKills).toBe(0);
        expect(result.shipLosses).toBe(0);
    });
});
