import mongoose from 'mongoose';
import HistoryService from '../services/history';

describe('history.log', () => {
    let insertedHistory: any;
    let historyRepo: any;
    let playerStatisticsService: any;
    let statisticsService: any;
    let historyService: HistoryService;

    function createPlayer(overrides: any = {}) {
        return {
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            alias: 'Player',
            avatar: null,
            researchingNow: 'weapons',
            researchingNext: 'banking',
            credits: 100,
            creditsSpecialists: 0,
            isOpenSlot: false,
            defeated: false,
            defeatedDate: null,
            afk: false,
            ready: false,
            readyToQuit: false,
            research: {
                weapons: { level: 1 },
                banking: { level: 1 },
                manufacturing: { level: 1 },
                hyperspace: { level: 1 },
                scanning: { level: 1 },
                experimentation: { level: 1 },
                terraforming: { level: 1 },
                specialists: { level: 1 }
            },
            scheduledActions: [],
            ...overrides
        };
    }

    function createGame(players: any[]) {
        return {
            _id: new mongoose.Types.ObjectId(),
            state: {
                tick: 0,
                productionTick: 0
            },
            galaxy: {
                players,
                stars: [],
                carriers: []
            }
        };
    }

    function createStatsSlice(playerId: any, stats: any) {
        return {
            gameId: new mongoose.Types.ObjectId(),
            playerId,
            stats
        };
    }

    beforeEach(() => {
        insertedHistory = null;

        historyRepo = {
            findOne: jasmine.createSpy('findOne').and.resolveTo(null),
            insertOne: jasmine.createSpy('insertOne').and.callFake(async (history) => {
                insertedHistory = history;
            }),
            updateMany: jasmine.createSpy('updateMany').and.resolveTo(null),
            deleteMany: jasmine.createSpy('deleteMany').and.resolveTo(null)
        };

        const playerService = {};

        const  gameService = {
            on: jasmine.createSpy('on'),
            getById: jasmine.createSpy('getById').and.resolveTo({
                state: {
                    tick: 100
                },
                settings: {}
            })
        };

        playerStatisticsService = {
            getStats: jasmine.createSpy('getStats').and.returnValue({
                totalStars: 1,
                totalHomeStars: 1,
                totalEconomy: 2,
                totalIndustry: 3,
                totalScience: 4,
                totalShips: 5,
                totalCarriers: 6,
                totalSpecialists: 7,
                totalStarSpecialists: 8,
                totalCarrierSpecialists: 9,
                newShips: 10,
                warpgates: 11
            }),
            getIntelStats: jasmine.createSpy('getIntelStats').and.returnValue({
                shipKills: 123,
                shipLosses: 456
            })
        };

        const gameStateService = {};

        statisticsService = {
            getSlicesForGame: jasmine.createSpy('getSlicesForGame').and.resolveTo([])
        };

        // @ts-ignore - these are intentionally minimal fakes.
        historyService = new HistoryService(
            historyRepo,
            playerService as any,
            gameService as any,
            playerStatisticsService,
            gameStateService as any,
            statisticsService
        );
    });

    it('playerIntelStats creation happy path - should log combat statistics from matching player stat slices', async () => {
        const player1 = createPlayer({ alias: 'Joe Bob' });
        const player2 = createPlayer({ alias: 'Sally Bob' });
        const game = createGame([player1, player2]);

        const player1Stats = { source: 'player1Stats' };
        const player2Stats = { source: 'player2Stats' };

        statisticsService.getSlicesForGame.and.resolveTo([
            createStatsSlice(player1._id, player1Stats),
            createStatsSlice(player2._id, player2Stats)
        ]);

        playerStatisticsService.getIntelStats.and.callFake((stats) => {
            if (stats === player1Stats) {
                return {
                    shipKills: 12,
                    shipLosses: 3
                };
            }

            if (stats === player2Stats) {
                return {
                    shipKills: 8,
                    shipLosses: 5
                };
            }

            return {
                shipKills: 0,
                shipLosses: 0
            };
        });

        await historyService.log(game as any);

        expect(historyRepo.findOne).toHaveBeenCalledWith({
            gameId: game._id,
            tick: game.state.tick
        });

        expect(statisticsService.getSlicesForGame).toHaveBeenCalledWith(game._id);
        expect(historyRepo.insertOne).toHaveBeenCalled();

        expect(insertedHistory.players.length).toBe(2);

        expect(playerStatisticsService.getIntelStats).toHaveBeenCalledWith(player1Stats);
        expect(playerStatisticsService.getIntelStats).toHaveBeenCalledWith(player2Stats);

        expect(insertedHistory.players[0].playerId).toBe(player1._id);
        expect(insertedHistory.players[0].intelStatistics.shipKills).toBe(12);
        expect(insertedHistory.players[0].intelStatistics.shipLosses).toBe(3);

        expect(insertedHistory.players[1].playerId).toBe(player2._id);
        expect(insertedHistory.players[1].intelStatistics.shipKills).toBe(8);
        expect(insertedHistory.players[1].intelStatistics.shipLosses).toBe(5);

        // tick 0 should not trigger cleanup.
        expect(historyRepo.updateMany).not.toHaveBeenCalled();
    });

    it('playerIntelStats - when missing stat slice, it should default combat statistics to zero', async () => {
        const playerWithSlice = createPlayer({ alias: 'Totally Human Person' });
        const playerWithoutSlice = createPlayer({ alias: 'AI 2' });
        const game = createGame([playerWithSlice, playerWithoutSlice]);

        const playerStats = { source: 'playerStats' };

        statisticsService.getSlicesForGame.and.resolveTo([
            createStatsSlice(playerWithSlice._id, playerStats)
        ]);

        playerStatisticsService.getIntelStats.and.callFake((stats) => {
            if (stats === playerStats) {
                return {
                    shipKills: 14,
                    shipLosses: 6
                };
            }

            return {
                shipKills: 0,
                shipLosses: 0
            };
        });

        await historyService.log(game as any);

        expect(insertedHistory.players.length).toBe(2);

        expect(playerStatisticsService.getIntelStats).toHaveBeenCalledWith(playerStats);
        expect(playerStatisticsService.getIntelStats).toHaveBeenCalledWith(undefined);

        expect(insertedHistory.players[0].intelStatistics.shipKills).toBe(14);
        expect(insertedHistory.players[0].intelStatistics.shipLosses).toBe(6);

        expect(insertedHistory.players[1].intelStatistics.shipKills).toBe(0);
        expect(insertedHistory.players[1].intelStatistics.shipLosses).toBe(0);
    });

    it('regression - should not insert history twice (silly test but if it fails something is really wrong)', async () => {
        const player = createPlayer();
        const game = createGame([player]);

        historyRepo.findOne.and.resolveTo({
            gameId: game._id,
            tick: game.state.tick
        });

        await historyService.log(game as any);

        expect(statisticsService.getSlicesForGame).not.toHaveBeenCalled();
        expect(playerStatisticsService.getIntelStats).not.toHaveBeenCalled();
        expect(historyRepo.insertOne).not.toHaveBeenCalled();
    });
});


describe('HistoryService.listIntel', () => {
    let historyRepo: any;
    let gameService: any;
    let gameStateService: any;
    let historyService: HistoryService;

    beforeEach(() => {
        historyRepo = {
            find: jasmine.createSpy('find').and.resolveTo([])
        };

        gameService = {
            // Needed by HistoryService constructor.
            on: jasmine.createSpy('on'),

            // Needed by listIntel().
            getById: jasmine.createSpy('getById').and.resolveTo({
                settings: {
                    specialGalaxy: {
                        darkGalaxy: 'disabled'
                    }
                },
                state: {
                    tick: 100
                }
            })
        };

        gameStateService = {
            isFinished: jasmine.createSpy('isFinished').and.returnValue(false)
        };

        const playerService = {};
        const playerStatisticsService = {};
        const statisticsService = {};

        historyService = new HistoryService(
            historyRepo as any,
            playerService as any,
            gameService as any,
            playerStatisticsService as any,
            gameStateService as any,
            statisticsService as any
        );
    });

    it('should include intelStatistics db query (i.e. when client retrieves intel data for charts)', async () => {
        const gameId = new mongoose.Types.ObjectId();

        await historyService.listIntel(gameId as any, undefined, undefined);

        expect(gameService.getById).toHaveBeenCalledWith(gameId, {
            settings: 1,
            state: 1
        });

        expect(historyRepo.find).toHaveBeenCalled();

        const findArgs = historyRepo.find.calls.mostRecent().args;
        const projection = findArgs[1];

        expect(projection['players.intelStatistics.shipKills']).toBe(1);
        expect(projection['players.intelStatistics.shipLosses']).toBe(1);
    });
});