import { DBObjectId } from "./DBObjectId";
import { Guild } from "./Guild";
import { Player } from "./Player";
import {Team} from "./Game";


export interface PlayerIntelStatistics {
    kills: {
        ships: number,
    },
    losses: {
        ships: number,
    },
};


