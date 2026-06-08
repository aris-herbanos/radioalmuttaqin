// 🟢 AMAN TOTAL: Kita buang import type sirkular yang bikin TypeScript linglung
export const structure = (S: any) =>
  S.list()
    .title("Content Desk")
    .items([
      ...S.documentTypeListItems(),
    ]);