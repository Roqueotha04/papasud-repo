import { notFound } from "next/navigation";
import { getParcelaFicha } from "@/lib/actions/parcelas";
import { ParcelaFicha } from "@/app/components/ParcelaFicha";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ParcelaPage({ params }: Props) {
  const { id } = await params;
  const ficha = await getParcelaFicha(id);

  if (!ficha) {
    notFound();
  }

  return (
    <>
      <ParcelaFicha ficha={ficha} />
    </>
  );
}
