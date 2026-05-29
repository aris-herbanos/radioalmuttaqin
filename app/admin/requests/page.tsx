import prisma from "@/lib/prisma";
import { approveRequest } from "./actions";
import DeleteButton from "./DeleteButton"; 

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function RequestsPage() {
  const requests = await prisma.songRequest.findMany({
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-black text-emerald-900 uppercase italic tracking-tighter">
            Daftar Request Lagu 📩
          </h1>
          <p className="text-emerald-600 font-medium">Kelola permintaan nasyid dan salam dari pendengar Radio Suara Al Muttaqin.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-50 text-emerald-900 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Nama Pendengar</th>
                  <th className="px-8 py-5">Judul & Kategori</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Aksi Kendali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 font-bold text-gray-900">{req.name}</td>
                    <td className="px-8 py-6">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                        {req.song_title}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        req.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-orange-100 text-orange-600 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-3">
                        {req.status !== 'completed' && (
                          /* PERBAIKAN: Bungkus dengan inline async function daripada .bind() */
                          <form action={async () => {
                            "use server";
                            await approveRequest(req.id);
                          }}>
                            <button 
                              type="submit"
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              ✅ Putar
                            </button>
                          </form>
                        )}
                        
                        {/* Komponen Client untuk Hapus */}
                        <DeleteButton id={req.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Panel Kendali Radio v1.0 • Purwokerto, Jawa Tengah
          </p>
        </div>
      </div>
    </div>
  );
}