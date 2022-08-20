import { Utility } from '../io/utility';
import { IAttributes } from './attributes.interface';
import assert = require('assert');
const MurmurHash3 = require('imurmurhash');


export class Tag {
  protected _group: string = '';
  protected _prop: string = '';
  protected _attr: Map<string, Set<string>> = new Map<string, Set<string>>();
  protected _hash = 0;

  public constructor(_data: string) {
    try {
      // negative look-behind assertion
      // only match ':' and not '\:'
      const tag = _data.split(Utility.vcardSplitRex)[0];
      const attrs = tag.split(';');

      // attrs.shift()! - means the variable is non=null/non-undefined
      this._prop = attrs.shift()!;
      const frags = this._prop.split('.');
      if (frags.length > 1) {
        this._group = frags[0];
        this._prop = frags[1].toUpperCase();
      } else {
        this._prop = this._prop.toUpperCase();
      }

      if (!attrs) {
        return;
      }
      attrs.forEach(token => {
        const [type, val] = token.split('=');
        this.setAttr(type, val.split(','));
      });

      this._hash = MurmurHash3(this.toString()).result();

    } catch (ex) {
      this._prop = '';
      this._attr = new Map();
      return;
    }
  }

  protected setAttr(key: string, val: string[]) {
    key = key.toUpperCase();
    if (this._attr.has(key)) {
      let newSet = new Set(val);
      let oldSet = this._attr.get(key)!;
      let set = new Set([...oldSet, ...newSet]);
      this._attr.set(key, set);
    } else {
      this._attr.set(key, new Set(val));
    }
  }


  // properties
  //
  // hash
  public get hash(): number {
    return this._hash;
  }

  // group
  public get group(): string {
    return this._group;
  }

  public set group(val: string) {
    this._group = val;
  }

  // prop
  public get prop(): string {
    return this._prop;
  }

  public set prop(val: string) {
    this._prop = val;
  }

  // attr
  public get attr(): IAttributes {
    if (this._attr.size === 0) {
      return {};
    }

    return Array.from(this._attr.keys())
                .map(key => {
                  return {[key]: [...this._attr.get(key)!]};
                })
                .reduce((accum: any, curr: any) => {
                  Object.keys(curr)
                        .forEach(key => {
                          accum[key] = curr[key];
                        });
                  return accum;
                });
  }

  public set attr(attributes: IAttributes) {
    Object.keys(attributes)
          .forEach(key => {
            let val = attributes[key];
            if (typeof val === 'string') {
              val = [val];
            }
            this.setAttr(key, val);
          });
  }


  public toString(): string {
    if (!this._prop) {
      return '';
    }

    let getprop = () => {
      let t = this._prop;
      if (this.group) {
        t = `${this._group}.${t}`;
      }
      return t;
    };

    if (!this._attr) {
      return getprop();
    }

    const attributes = Array.from(this._attr.keys())
                            .map(key => {
                              const set = this._attr.get(key)!;
                              const vals = [...set].join(',');
                              return `;${key}=${vals}`;
                            })
                            .join(',');
    return `${getprop()}${attributes}`;
  }


  // public toJSON() {
  //   return {
  //     prop: this._prop,
  //     group: this._group,
  //     attr: this.attr
  //   };
  // }


  public static fromObject(obj: any): Tag {
    assert(obj !== undefined);

    if (!obj.hasOwnProperty('prop')) {
      throw new ReferenceError('missing "prop" field');
    }

    const tag = new Tag('');
    tag.prop = obj.prop;

    if (obj.hasOwnProperty('group')) {
      tag.group = obj.group;
    }

    if (obj.hasOwnProperty('attr')) {
      tag.attr = obj.attr;
    }

    return tag;
  }

}
