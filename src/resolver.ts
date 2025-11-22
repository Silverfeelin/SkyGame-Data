import { parse } from 'jsonc-parser';
import type { IGuid } from './interfaces/base.interface.js';
import type { ISkyData } from './interfaces/sky-data.interface.js';
import type { IArea } from './interfaces/area.interface.js';
import type { ISpirit } from './interfaces/spirit.interface.js';
import { ItemType, type IEventInstance, type IEventInstanceSpirit, type IIAP, type IItem, type IItemList, type IMapShrine, type INode, type IRealmConstellation, type IRevisedSpiritTree, type IShop, type ISpiritTree, type ISpiritTreeTier, type IWingedLight } from './index.js';
import { SkyDateHelper } from './helpers/date-helper.js';
import { SpiritTreeHelper } from './helpers/spirit-tree-helper.js';
import type { ISpecialVisitSpirit } from './interfaces/special-visit-spirit.interface.js';


export class SkyDataResolver {
  data: ISkyData;
  guids = new Map<string, IGuid>();
  itemIds = new Map<number, IItem>();

  constructor(data: any) {
    this.data = data as ISkyData;
  }

  /**
   * Parses Sky data from a JSONC string.
   * To resolve references, use `resolveSkyData` after parsing.
   * @param json - The contents of `/assets/everything.json`.
  */
  static parse(json: string): any {
    return parse(json, undefined, {
      disallowComments: false,
      allowEmptyContent: false,
      allowTrailingComma: true
    }) as any;
  }

  /**
   * Resolves all references in the Sky data object.
   * The object is modified in-place.
   * @param data - The Sky data object to resolve.
   */
  static resolve(data: any): ISkyData {
    const resolver = new SkyDataResolver(data);
    resolver.resolve();
    return resolver.data as ISkyData;
  }

  resolve(): void {
    Object.values(this.data).forEach(c => this.registerGuids(c));

    this.resolveRealms();
    this.resolveAreas();
    this.resolveSeasons();
    this.resolveSpirits();
    this.resolveTravelingSpirits();
    this.resolveSpecialVisits();
    this.resolveSpiritTreeTiers();
    this.resolveSpiritTrees();
    this.resolveEvents();
    this.resolveShops();
    this.resolveItems();
    this.resolveItemLists();
    this.resolveSeasonItems();

    this.data.guids = this.guids;
    this.data.itemIds = this.itemIds;
  }

  private registerGuids(config: any): void {
    if (!Array.isArray(config.items)) { return; }
    for (const item of config.items) {
      this.registerGuid(item);
    }
  }

  private registerGuid(obj: IGuid): void {
    if (!obj.guid) { throw new Error('Missing GUID'); }
    if (obj.guid?.length !== 10) { throw new Error(`Invalid GUID: ${obj.guid}`); }
    if (this.guids.has(obj.guid)) { throw new Error(`Duplicate GUID: ${obj.guid}`); }
    this.guids.set(obj.guid, obj);
  }

  private resolveRealms(): void {
    this.data.realms.items.forEach(realm => {
      // Map areas to realms.
      realm.areas?.forEach((area, i) => {
        area = this.guids.get(area as any) as IArea;
        realm.areas![i] = area;
        area.realm = realm;
      });

      // Map constellation
      if (realm.constellation) {
        realm.constellation = this.guids.get(realm.constellation as any) as IRealmConstellation
      }
      
      // Map constellation spirits.
      realm.constellation?.icons?.forEach((icon, i) => {
        const spirit = this.guids.get(icon.spirit as any) as ISpirit;
        realm.constellation!.icons![i]!.spirit = spirit;
      });

      // Map elders
      if (realm.elder) {
        realm.elder = this.guids.get(realm.elder as any) as ISpirit;
      }
    });
  }

  private resolveAreas(): void {    
    this.data.areas.items.forEach(area => {
      // Map Spirit to Areas.
      area.spirits?.forEach((spirit, i) => {
        spirit = this.guids.get(spirit as any) as ISpirit;
        area.spirits![i] = spirit;
        spirit.area = area;
      });

      // Map Winged Light to Area.
      area.wingedLights?.forEach((wl, i) => {
        wl = this.guids.get(wl as any) as IWingedLight;
        area.wingedLights![i] = wl;
        wl.area = area;
      });

      // Map connected areas.
      area.connections?.forEach((c, i) => {
        c.area = this.guids.get(c.area as any) as IArea;
      });

      // Map.. Map Shrine to Area.
      area.mapShrines?.forEach((ms, i) => {
        const mapShrine = this.guids.get(ms as any) as IMapShrine;
        area.mapShrines![i] = mapShrine;
        mapShrine.area = area;
      });
    });
  }
  
  private resolveSeasons(): void {    
    this.data.seasons.items.forEach((season, i) => {
      season.number = i + 1;
      if (typeof season.date === 'string') {
        season.date = SkyDateHelper.fromStringSky(season.date)!;
      }
      if (typeof season.endDate === 'string') {
        season.endDate = SkyDateHelper.fromStringSky(season.endDate)!.endOf('day');
      }

      // Map Spirits to Season.
      season.spirits?.forEach((spirit, si) => {
        spirit = this.guids.get(spirit as any) as ISpirit;
        season.spirits![si] = spirit;
        spirit.season = season;
      });

      // Map Shops to Season
      season.shops?.forEach((shop, si) => {
        shop = this.guids.get(shop as any) as IShop;
        season.shops![si] = shop;
        shop.season = season;
      });

      // Map included trees (one-way).
      season.includedTrees?.forEach((tree, ti) => {
        tree = this.guids.get(tree as any) as ISpiritTree;
        season.includedTrees![ti] = tree;
      });
    });
  }

  private resolveSpirits(): void {
    this.data.spirits.items.forEach((spirit, i) => {
      spirit._index = i;

      // Map spirits to spirit tree.
      if (spirit.tree) {
        const tree = this.guids.get(spirit.tree as any) as ISpiritTree;
        tree.spirit = spirit;
        spirit.tree = tree;
      }

      // Map past versions of spirit tree.
      if (spirit.treeRevisions) {
        spirit.treeRevisions.forEach((pt, i) => {
          const tree = this.guids.get(pt as any) as IRevisedSpiritTree;
          tree.spirit = spirit;
          spirit.treeRevisions![i] = tree;
        });
      }
    });    
  }

  private resolveTravelingSpirits(): void {    
    const tsCounts: {[key: string]: number} = {};
    this.data.travelingSpirits.items.forEach((ts, i) => {
      // Initialize dates
      if (typeof ts.date === 'string') {
        ts.date = SkyDateHelper.fromStringSky(ts.date);
      }
      ts.endDate = typeof ts.endDate === 'string' 
        ? SkyDateHelper.fromStringSky(ts.endDate)?.endOf('day')
        : ts.date.plus({ days: 3 }).endOf('day');

      // Map TS to Spirit.
      const spirit = this.guids.get(ts.spirit as any) as ISpirit;
      ts.spirit = spirit;
      spirit.travelingSpirits ??= [];
      spirit.travelingSpirits.push(ts);

      tsCounts[spirit.name] ??= 0;
      tsCounts[spirit.name]!++;
      ts.number = i+1;
      ts.visit = tsCounts[spirit.name]!;

      // Map TS to Spirit Tree.
      const tree = this.guids.get(ts.tree as any) as ISpiritTree;
      ts.tree = tree;
      tree.travelingSpirit = ts;
    })
  }

  private resolveSpecialVisits(): void {
    this.data.specialVisits.items.forEach((sv, i) => {
      // Initialize dates
      if (typeof sv.date === 'string') {
        sv.date = SkyDateHelper.fromStringSky(sv.date)!;
      }
      if (typeof sv.endDate === 'string') {
        sv.endDate = SkyDateHelper.fromStringSky(sv.endDate)!.endOf('day');
      }

      // Map SV to Area.
      if (sv.area) {
        const area = this.guids.get(sv.area as any) as IArea;
        sv.area = area;
        area.specialVisits ??= [];
        area.specialVisits.push(sv);
      }

      // Map Visits.
      sv.spirits?.forEach((visit, si) => {
        visit = this.guids.get(visit as any) as ISpecialVisitSpirit;
        sv.spirits![si] = visit;
        visit.visit = sv;

        // Map Visit to Spirit.
        const spirit = this.guids.get(visit.spirit as any) as ISpirit;
        sv.spirits![si]!.spirit = spirit;
        spirit.specialVisitSpirits ??= [];
        spirit.specialVisitSpirits.push(visit);

        // Map Visit to Spirit Tree.
        const tree = this.guids.get(visit.tree as any) as ISpiritTree;
        sv.spirits![si]!.tree = tree;
        tree.specialVisitSpirit = visit;
      });
    });    
  }

  private resolveSpiritTrees(): void {    
    this.data.spiritTrees.items.forEach(spiritTree => {
        // Map Spirit Tree to Node.
        if (spiritTree.node) {
          const node = this.guids.get(spiritTree.node as any) as INode;
          if (!node) { console.error('Node not found', spiritTree.node); }
          spiritTree.node = node;
          node.tree = spiritTree;
          this.resolveNode(node);
        }

        // Map Spirit tree tier.
        if (typeof spiritTree.tier === 'string') {
          const tier = this.guids.get(spiritTree.tier) as ISpiritTreeTier;
          if (!tier) { console.error('Spirit tree tier not found', spiritTree.tier); }
          spiritTree.tier = tier;
          tier.tree = spiritTree;
          SpiritTreeHelper.getNodes(spiritTree).forEach(n => n.tree = spiritTree);
        }
    });
  }

  private resolveSpiritTreeTiers(): void {    
    this.data.spiritTreeTiers.items.forEach(tier => {
      // Map tier nodes.
      tier.rows?.forEach(row => {
        row.forEach((node, ni) => {
          if (!node) { return; }
          const n = this.guids.get(node as any) as INode;
          if (!n) { console.error('Node not found', node); }
          row[ni] = n;
          n.root = n;
          this.resolveNode(n);
        });
      });

      if (!tier.prev) {
        tier.root = tier;
      }

      // Map next tier.
      if (typeof tier.next === 'string') {
        const nextTier = this.guids.get(tier.next as any) as ISpiritTreeTier;
        if (!nextTier) { console.error('Next spirit tree tier not found', tier.next); }
        tier.next = nextTier;
        nextTier.prev = tier;
        nextTier.root = tier.root;
      }
    });
  }

  private resolveEvents(): void {    
    this.data.events.items.forEach(event => {
      event.instances?.forEach((eventInstance, iInstance) => {
        eventInstance = this.guids.get(eventInstance as any) as IEventInstance;
        event.instances![iInstance] = eventInstance;
        eventInstance.event = event;
        eventInstance.number = iInstance + 1;

        // Initialize dates
        if (typeof eventInstance.date === 'string') {
          eventInstance.date = SkyDateHelper.fromStringSky(eventInstance.date)!
        }
        if (typeof eventInstance.endDate === 'string') {
          eventInstance.endDate = SkyDateHelper.fromStringSky(eventInstance.endDate)!.endOf('day');
        }

        // Map shops to instance.
        eventInstance.shops?.forEach((shop, iShop) => {
          shop = this.guids.get(shop as any) as IShop;
          eventInstance.shops![iShop] = shop;
          shop.event = eventInstance;
        });

        // Initialize event spirits.
        eventInstance.spirits?.forEach((eventSpirit, ies) => {
          eventSpirit = this.guids.get(eventSpirit as any) as IEventInstanceSpirit;
          eventInstance.spirits![ies] = eventSpirit;
          eventSpirit.eventInstance = eventInstance;

          const spirit = this.guids.get(eventSpirit.spirit as any) as ISpirit;
          if (!spirit) { console.error( 'Spirit not found', eventSpirit.spirit); }
          eventSpirit.spirit = spirit;
          eventSpirit.spirit.eventInstanceSpirits = [];
          eventSpirit.spirit.eventInstanceSpirits.push(eventSpirit);

          const tree = this.guids.get(eventSpirit.tree as any) as ISpiritTree;
          if (!tree) { console.error( 'Tree not found', eventSpirit.tree); }
          eventSpirit.tree = tree;
          tree.eventInstanceSpirit = eventSpirit;
        });
      });
    });
  }

  private resolveShops(): void {    
    this.data.shops.items.forEach(shop => {
      // Map Shop to Spirit.
      if (shop.spirit) {
        const spirit = this.guids.get(shop.spirit as any) as ISpirit;
        shop.spirit = spirit;
        spirit.shops ??= [];
        spirit.shops.push(shop);
      }

      shop.iaps?.forEach((iap, iIap) => {
        iap = this.guids.get(iap as any) as IIAP;
        shop.iaps![iIap] = iap;
        iap.shop = shop;

        iap.items?.forEach((itemGuid, iItem) => {
          const item = this.guids.get(itemGuid as any) as IItem;
          if (!item) { console.error('Item not found', itemGuid); }
          iap.items![iItem] = item;
          item.iaps ??= [];
          item.iaps.push(iap);

          if (iap.bought) {
            item.unlocked = true;
          }
        });
      });

      if (shop.itemList) {
        const itemList = this.guids.get(shop.itemList as any) as IItemList;
        shop.itemList = itemList;
        itemList.shop = shop;
      }
    });
  }

  private resolveItems(): void {    
    const ids = new Set<number>();
    const types = new Set<string>();
    for (const type in ItemType) { types.add(type); }

    let shouldAbort = false;
    const emoteOrders: { [key: string]: number } = {};
    const emotes: Array<IItem> = [];
    this.data.items.items.forEach(item => {
      if (typeof(item.id) === 'number') {
        if (ids.has(item.id)) {
          console.error('Duplicate item ID.', item.id, item);
          shouldAbort = true;
        } else {
          ids.add(item.id);
          this.itemIds.set(item.id, item);
        }
      } else {
        console.error('Item ID not defined', item);
        shouldAbort = true;
      }

      if (!item.type || !types.has(item.type)) {
        console.error('Item type not defined.', item);
        shouldAbort = true;
      }

      if (item.type === 'Emote') {
        if (item.level === 1) { emoteOrders[item.name] = item.order ?? 999999; }
        else { emotes.push(item); }
      }

      if (!item.unlocked && item.autoUnlocked) { item.unlocked = true; }
      item.order ??= 999999;
    });

    emotes.forEach(emote => emote.order = emoteOrders[emote.name] ?? emote.order);

    if (shouldAbort) {
      throw new Error('Errors found while resolving items. See console for details.');
    }
  }

  private resolveItemLists(): void {    
    this.data.itemLists.items.forEach(itemList => {
      itemList.items.forEach(itemNode => {
        itemNode.itemList = itemList;

        if (typeof itemNode.item === 'string') {
          const item = this.guids.get(itemNode.item as any) as IItem;
          itemNode.item = item;

          item.listNodes ??= [];
          item.listNodes.push(itemNode);
        }
      });
    });
  }

  private resolveSeasonItems(): void {    
    for (const season of this.data.seasons.items) {
      // Spirit items
      for (const spirit of season.spirits ?? []) {
        const items = SpiritTreeHelper.getItems(spirit.tree, true);
        for (const item of items) {
          item.season = season;
        }
      }

      // IAP items
      for (const shop of season.shops ?? []) {
        for (const iap of shop.iaps ?? []) {
          for (const item of iap.items ?? []) {
            item.season = season;
          }
        }
      }
    }
  }

  private resolveNode(node: INode, prev?: INode, root?: INode): INode {
    root ??= node;
    const getNode = (guid: string) => {
      const v = this.guids.get(guid) as INode;
      return this.resolveNode(v, node, root ?? node);
    }

    node.root = root;
    if (prev) { node.prev = prev; }
    if (typeof node.n === 'string') { node.n = getNode(node.n); }
    if (typeof node.nw === 'string') { node.nw = getNode(node.nw); }
    if (typeof node.ne === 'string') { node.ne = getNode(node.ne); }

    if (typeof node.item === 'string') {
      const item = this.guids.get(node.item as any) as IItem;
      if (!item) { console.error('Node item not found', node, node.item); }
      node.item = item;
      item.nodes ??= [];
      item.nodes.push(node);
    } else if (node.item) {
      node.item.nodes ??= [];
      node.item.nodes.push(node);
    }

    if (node.hiddenItems?.length) {
      node.hiddenItems.forEach((itemGuid, i) => {
        if (typeof itemGuid !== 'string') return;
        const item = this.guids.get(itemGuid as any) as IItem;
        if (!item) { console.error('Node hidden item not found', node, itemGuid); }

        node.hiddenItems![i] = item;
        item.hiddenNodes ??= [];
        item.hiddenNodes.push(node);

        // Mark hidden item as unlocked.
        if (node.unlocked) {
          item.unlocked = true;
        }
      });
    }

    return node;
  }

}