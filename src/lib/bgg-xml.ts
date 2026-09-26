// Shape of the parts of BoardGameGeek's XML API responses that we read, as produced by
// fast-xml-parser with { ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true }
// (attributes that look like numbers arrive as numbers, everything else as strings).

export interface XmlValueAttr {
  '@_value'?: string | number;
}

export interface XmlName extends XmlValueAttr {
  '@_type'?: string;
}

export interface XmlLink extends XmlValueAttr {
  '@_type'?: string;
}

export interface XmlRank extends XmlValueAttr {
  '@_name'?: string;
}

export interface BggXmlItem {
  '@_id'?: string | number;
  name?: XmlName | XmlName[];
  yearpublished?: XmlValueAttr;
  minplayers?: XmlValueAttr;
  maxplayers?: XmlValueAttr;
  minplaytime?: XmlValueAttr;
  maxplaytime?: XmlValueAttr;
  minage?: XmlValueAttr;
  description?: string;
  thumbnail?: string;
  image?: string;
  link?: XmlLink | XmlLink[];
  statistics?: {
    ratings?: {
      average?: XmlValueAttr;
      averageweight?: XmlValueAttr;
      usersrated?: XmlValueAttr;
      ranks?: { rank?: XmlRank | XmlRank[] };
    };
  };
}

// The parser gives a bare object for one child and an array for several
export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// parseInt/parseFloat on an attribute that may be a number, a string or absent (NaN when absent)
export const toInt = (value: unknown): number => parseInt(String(value), 10);
export const toFloat = (value: unknown): number => parseFloat(String(value));

export function primaryName(item: BggXmlItem): string | undefined {
  const names = asArray(item.name);
  const name = names.find(n => n['@_type'] === 'primary') ?? names[0];
  return name?.['@_value'] === undefined ? undefined : String(name['@_value']);
}
