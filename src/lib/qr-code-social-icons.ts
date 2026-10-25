import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPinterestP,
  FaSnapchat,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { type SocialIconId } from "@/lib/social-icons";

export const socialIconOptions: {
  id: SocialIconId;
  label: string;
  Icon: IconType;
}[] = [
  { id: "instagram", label: "Instagram", Icon: FaInstagram },
  { id: "facebook", label: "Facebook", Icon: FaFacebookF },
  { id: "tiktok", label: "TikTok", Icon: FaTiktok },
  { id: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp },
  { id: "youtube", label: "YouTube", Icon: FaYoutube },
  { id: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn },
  { id: "x", label: "X", Icon: FaXTwitter },
  { id: "telegram", label: "Telegram", Icon: FaTelegram },
  { id: "pinterest", label: "Pinterest", Icon: FaPinterestP },
  { id: "snapchat", label: "Snapchat", Icon: FaSnapchat },
  { id: "discord", label: "Discord", Icon: FaDiscord },
];

export async function renderSocialIconDataUrl(iconId: SocialIconId, color: string): Promise<string> {
  const option = socialIconOptions.find((item) => item.id === iconId);
  if (!option) throw new Error("Selecione um ícone de rede social válido.");

  const svg = renderToStaticMarkup(createElement(option.Icon, { color, size: 180 }));
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível preparar o ícone escolhido."));
      image.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar o ícone.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
