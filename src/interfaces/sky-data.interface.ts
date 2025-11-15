import type { IArea } from './area.interface.js';
import type { IEvent, IEventInstance, IEventInstanceSpirit } from './event.interface.js';
import type { IIAP } from './iap.interface.js';
import type { IItemList } from './item-list.interface.js';
import type { IItem } from './item.interface.js';
import type { IMapShrine } from './map-shrine.interface.js';
import type { INode } from './node.interface.js';
import type { IRealm, IRealmConstellation } from './realm.interface.js';
import type { ISpecialVisit } from './special-visit.interface.js';
import type { ISpecialVisitSpirit } from './special-visit-spirit.interface.js';
import type { ISeason } from './season.interface.js';
import type { IShop } from './shop.interface.js';
import type { ISpiritTree, ISpiritTreeTier } from './spirit-tree.interface.js';
import type { ITravelingSpirit } from './traveling-spirit.interface.js';
import type { IWingedLight } from './winged-light.interface.js';
import type { ISpirit } from './spirit.interface.js';
import type { IGuid } from './base.interface.js';

export interface IDataConfig<T> {
  items: Array<T>;
}

export interface ISkyData {
  guids: Map<string, IGuid>;
  itemIds: Map<number, IItem>;

  /* Stable */
  areas: IDataConfig<IArea>;
  constellations: IDataConfig<IRealmConstellation>;
  events: IDataConfig<IEvent>;
  eventInstances: IDataConfig<IEventInstance>;
  eventInstanceSpirits: IDataConfig<IEventInstanceSpirit>;
  iaps: IDataConfig<IIAP>;
  itemLists: IDataConfig<IItemList>;
  items: IDataConfig<IItem>;
  mapShrines: IDataConfig<IMapShrine>;
  nodes: IDataConfig<INode>;
  realms: IDataConfig<IRealm>;
  seasons: IDataConfig<ISeason>;
  shops: IDataConfig<IShop>;
  specialVisits: IDataConfig<ISpecialVisit>;
  specialVisitSpirits: IDataConfig<ISpecialVisitSpirit>;
  spirits: IDataConfig<ISpirit>;
  spiritTrees: IDataConfig<ISpiritTree>;
  spiritTreeTiers: IDataConfig<ISpiritTreeTier>;
  travelingSpirits: IDataConfig<ITravelingSpirit>;
  wingedLights: IDataConfig<IWingedLight>;

  /* Unstable */
  candles: IDataConfig<any>;
}