// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { renderWithProviders } from "@/test-utils";
import { blankValues, courseFormSchema, type CourseFormValues } from "@/lib/course-form";
import { CourseBasicsSection } from "./CourseBasicsSection";

// INFORMAÇÕES BÁSICAS (decisões do operador, 27/09/2026): cada campo mostra
// quantos caracteres cabem (Título 60 · Subtítulo 120 · Slug 80 · Descrição
// 5.000) e a descrição tem os botões de negrito, itálico e listas, com a aba
// Visualizar, como no GitHub.

function Formulario({
  inicial = {},
  aoSalvar = () => {},
}: {
  inicial?: Partial<CourseFormValues>;
  aoSalvar?: (v: CourseFormValues) => void;
}) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { ...blankValues, slug: "curso", title: "Curso", ...inicial },
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(aoSalvar)}>
        <CourseBasicsSection />
        <button type="submit">Salvar</button>
      </form>
    </FormProvider>
  );
}

const descricao = () => screen.getByLabelText("Descrição") as HTMLTextAreaElement;

/** Digita `texto` e seleciona de `inicio` a `fim`, como o operador faria com o mouse. */
function escreverESelecionar(texto: string, inicio: number, fim: number) {
  fireEvent.change(descricao(), { target: { value: texto } });
  descricao().setSelectionRange(inicio, fim);
}

describe("limites de caracteres", () => {
  it("cada campo trava no limite e mostra quanto já foi usado", () => {
    renderWithProviders(<Formulario inicial={{ title: "Excel com IA", subtitle: "" }} />);

    for (const [rotulo, limite] of [
      ["Título", "60"],
      ["Subtítulo", "120"],
      ["Slug", "80"],
      ["Descrição", "5000"],
    ] as const) {
      expect(screen.getByLabelText(rotulo).getAttribute("maxLength")).toBe(limite);
    }
    expect(screen.getByText("12/60")).toBeTruthy();
    expect(screen.getByText("0/120")).toBeTruthy();
    expect(screen.getByText("0/5.000")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Subtítulo"), { target: { value: "Do zero" } });
    expect(screen.getByText("7/120")).toBeTruthy();
  });

  it("curso que já estava acima do limite: avisa e não salva", async () => {
    const aoSalvar = vi.fn();
    renderWithProviders(<Formulario inicial={{ title: "x".repeat(61) }} aoSalvar={aoSalvar} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Use no máximo 60 caracteres.")).toBeTruthy();
    expect(aoSalvar).not.toHaveBeenCalled();
  });
});

describe("botões da descrição", () => {
  it("Negrito põe ** em volta do trecho selecionado; clicar de novo tira", () => {
    renderWithProviders(<Formulario />);
    escreverESelecionar("Aprenda PROCX hoje", 8, 13);

    fireEvent.click(screen.getByRole("button", { name: "Negrito" }));
    expect(descricao().value).toBe("Aprenda **PROCX** hoje");
    expect(screen.getByText("22/5.000")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Negrito" }));
    expect(descricao().value).toBe("Aprenda PROCX hoje");
  });

  it("espaço selecionado junto fica fora da marca", () => {
    renderWithProviders(<Formulario />);
    escreverESelecionar("Aprenda PROCX hoje", 7, 14);

    fireEvent.click(screen.getByRole("button", { name: "Itálico" }));
    expect(descricao().value).toBe("Aprenda _PROCX_ hoje");
  });

  it("sem nada selecionado, Negrito deixa o cursor entre as marcas", () => {
    renderWithProviders(<Formulario />);
    escreverESelecionar("Oi ", 3, 3);

    fireEvent.click(screen.getByRole("button", { name: "Negrito" }));
    expect(descricao().value).toBe("Oi ****");
    expect(descricao().selectionStart).toBe(5);
  });

  it("Lista e Lista numerada marcam cada linha selecionada", () => {
    renderWithProviders(<Formulario />);
    const texto = "Você vai:\nfiltrar\n\nsomar";
    escreverESelecionar(texto, 10, texto.length);

    fireEvent.click(screen.getByRole("button", { name: "Lista numerada" }));
    expect(descricao().value).toBe("Você vai:\n1. filtrar\n\n2. somar");

    escreverESelecionar(texto, 10, texto.length);
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(descricao().value).toBe("Você vai:\n- filtrar\n\n- somar");
  });
});

describe("aba Visualizar", () => {
  it("mostra o negrito de verdade e esconde os botões; Escrever volta ao texto", async () => {
    renderWithProviders(<Formulario inicial={{ description: "Um **curso** completo" }} />);

    fireEvent.click(screen.getByRole("tab", { name: "Visualizar" }));

    expect((await screen.findByText("curso")).tagName).toBe("STRONG");
    expect(screen.queryByRole("button", { name: "Negrito" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Escrever" }));
    expect(descricao().value).toBe("Um **curso** completo");
  });

  it("HTML digitado aparece como texto, e nada vira elemento", async () => {
    const { container } = renderWithProviders(<Formulario />);
    fireEvent.change(descricao(), { target: { value: "<script>alert(1)</script>" } });

    fireEvent.click(screen.getByRole("tab", { name: "Visualizar" }));

    expect(await screen.findByText("<script>alert(1)</script>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
  });

  it("descrição vazia: avisa que não há nada para ver", () => {
    renderWithProviders(<Formulario />);

    fireEvent.click(screen.getByRole("tab", { name: "Visualizar" }));
    expect(screen.getByText("Nada para visualizar ainda.")).toBeTruthy();
  });
});
