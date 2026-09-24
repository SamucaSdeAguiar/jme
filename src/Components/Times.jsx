import "./Times.css";

import sushi from "../assets/sushi.png";
import pizza from "../assets/pizza.png";
import hamburger from "../assets/hamburguer.png";

function Time() {
    return (
        <div className="time">

            <div className="time-card">
                <button>
                    <img src={sushi} alt="Sushi" />
                </button>

                <p>Time Sushi - Verde</p>
            </div>


            <div className="time-card">
                <button>
                    <img src={pizza} alt="Pizza" />
                </button>

                <p>Time Pizza - Amarelo</p>
            </div>


            <div className="time-card">
                <button>
                    <img src={hamburger} alt="Hambúrguer" />
                </button>

                <p>Time Hambúrguer - Vermelho</p>
            </div>


            <section className="revolta">
                <Link to="/">
                <button>Voltar</button>
                </Link>
            </section>

        </div>
    );
}

export default Time;