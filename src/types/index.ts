export type ApoioGrau =
  | "apoiador_forte"
  | "apoiador_moderado"
  | "simpatizante"
  | "indeciso"
  | "opositor"
  | "nao_classificado";

export type Influencia = "baixa" | "media" | "alta";

export type PerfilUsuario =
  | "admin"
  | "coordenacao"
  | "coordenador_territorial"
  | "equipe_rua"
  | "atendimento"
  | "candidato";

export type StatusDemanda =
  | "registrada"
  | "analise"
  | "encaminhada"
  | "respondida"
  | "resolvida";

export type TipoInteracao =
  | "visita"
  | "reuniao"
  | "ligacao"
  | "whatsapp"
  | "evento"
  | "retorno";

export type CampoPersonalizadoEntidade = "pessoas" | "demandas" | "liderancas";

export type CampoPersonalizadoTipo =
  | "texto"
  | "numero"
  | "data"
  | "booleano"
  | "opcao";

export type CampoPersonalizadoValor = string | number | boolean | null;

export type CamposPersonalizados = Record<string, CampoPersonalizadoValor>;

export interface CampoPersonalizado {
  id: string;
  campanha_id: string;
  entidade: CampoPersonalizadoEntidade;
  chave: string;
  rotulo: string;
  tipo: CampoPersonalizadoTipo;
  opcoes: string[];
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Campanha {
  id: string;
  nome: string;
  candidato: string;
  cargo: string;
  municipio: string;
  uf: string;
  created_at: string;
}

export interface Territorio {
  id: string;
  campanha_id: string;
  nome: string;
  tipo: "bairro" | "distrito" | "comunidade" | "zona";
  responsavel_id?: string;
  created_at: string;
}

export interface Pessoa {
  id: string;
  campanha_id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  bairro?: string;
  endereco?: string;
  secao_eleitoral?: string;
  categoria?: string;
  grau_apoio: ApoioGrau;
  influencia: Influencia;
  responsavel_id?: string;
  observacoes?: string;
  campos_personalizados?: CamposPersonalizados;
  created_at: string;
  updated_at: string;
}

export interface Demanda {
  id: string;
  campanha_id: string;
  pessoa_id?: string;
  territorio_id?: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  status: StatusDemanda;
  responsavel_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Interacao {
  id: string;
  campanha_id: string;
  pessoa_id: string;
  tipo: TipoInteracao;
  descricao?: string;
  usuario_id: string;
  created_at: string;
}
