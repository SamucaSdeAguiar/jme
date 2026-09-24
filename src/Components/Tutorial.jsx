import "./Tutorial.css";

import { Link } from "react-router-dom";

function Tutorial() {
    return (
        <div className="tutorial">

            <div className="tutorial-caixa">

                <h1>COMO JOGAR</h1>

                <div className="tutorial-conteudo">

                    <section>
                        <h2>OBJETIVO</h2>

                        <p>
                            Domine territórios, aumente sua pontuação
                            e conquiste o Centro da Cidade.
                        </p>
                    </section>


                    <section>
                        <h2>PONTOS</h2>

                        <p>
                            Você começa ganhando 10 pontos por rodada.
                        </p>

                        <p>
                            Cada território conquistado adiciona +2 pontos por rodada.
                        </p>

                        <p>
                            O Centro da Cidade é um território especial
                            e vale mais pontos.
                        </p>
                    </section>


                    <section>
                        <h2>SUAS AÇÕES</h2>

                        <div className="acoes">

                            <div>
                                <strong>DEFENDER</strong>
                                <span>
                                    Proteja seus territórios.
                                </span>
                            </div>

                            <div>
                                <strong>EXPLORAR</strong>
                                <span>
                                    Descubra novas regiões.
                                </span>
                            </div>

                            <div>
                                <strong>CAPTURAR</strong>
                                <span>
                                    Conquiste novos territórios.
                                </span>
                            </div>

                            <div>
                                <strong>RECUAR</strong>
                                <span>
                                    Retire seus entregadores.
                                </span>
                            </div>

                        </div>
                    </section>


                    <section>
                        <h2>CARTAS DE TRÂNSITO</h2>

                        <p>
                            As cartas podem criar efeitos que dificultam
                            suas ações durante a partida.
                        </p>

                        <p>
                            Exemplo: <strong>Limite de Velocidade</strong>
                            limita o movimento dos seus entregadores.
                        </p>
                    </section>

                </div>


                <Link to="/">
                    <button className="voltar">
                        VOLTAR
                    </button>
                </Link>

            </div>

        </div>
    );
}

export default Tutorial;