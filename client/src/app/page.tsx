import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Introducing First</h1>
          </div>
        </div>
      </main>
    </div>
  );
}
