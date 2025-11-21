import type { IGuid } from './base.interface.js';
import type { IMapData } from './map-data.interface.js';
import type { IMapShrine } from './map-shrine.interface.js';
import type { IRealm } from './realm.interface.js';
import type { ISpecialVisit } from './special-visit.interface.js';
import type { ISpirit } from './spirit.interface.js';
import type { IWiki } from './wiki.interface.js';
import type { IWingedLight } from './winged-light.interface.js';

export interface IArea extends IGuid {
  name: string;
  mapData?: IMapData;

  /** Area image. */
  imageUrl?: string;
  imagePosition?: string;

  /// References ///
  realm: IRealm;
  spirits?: Array<ISpirit>;
  wingedLights?: Array<IWingedLight>;
  specialVisits?: Array<ISpecialVisit>;
  connections?: Array<IAreaConnection>;
  mapShrines?: Array<IMapShrine>;

  _wiki?: IWiki;
}

export interface IAreaConnection {
  area: IArea;
}
