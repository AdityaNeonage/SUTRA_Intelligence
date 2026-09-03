const fs = require('fs');
let code = fs.readFileSync('src/Landing.tsx', 'utf8');
code = code.replace(
  `            </button>
          </div>
    </section>
  );
}`,
  `            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}`
);
fs.writeFileSync('src/Landing.tsx', code);
